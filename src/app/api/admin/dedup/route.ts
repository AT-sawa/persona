import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  preparePersonCandidates,
  findPersonMatches,
  type PersonMatchResult,
} from "@/lib/dedup";

export interface DuplicateGroup {
  person: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    created_at: string | null;
  };
  matches: Array<
    PersonMatchResult & {
      created_at: string | null;
    }
  >;
}

/**
 * GET /api/admin/dedup
 * Scans profiles for potential duplicate people (same person via multiple agents).
 * Returns grouped duplicate candidates sorted by confidence.
 */
export async function GET() {
  // Auth check: must be admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use service client to read all profiles
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: allProfiles, error } = await serviceClient
    .from("profiles")
    .select("id, full_name, email, phone, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch profiles" },
      { status: 500 }
    );
  }

  if (!allProfiles || allProfiles.length < 2) {
    return NextResponse.json({ groups: [], totalProfiles: allProfiles?.length ?? 0 });
  }

  // Prepare candidates
  const candidates = preparePersonCandidates(allProfiles);
  const createdAtMap = new Map(
    allProfiles.map((p) => [p.id, p.created_at])
  );

  // Find duplicates: for each person, check against all others
  const seenPairs = new Set<string>();
  const groups: DuplicateGroup[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const person = allProfiles[i];
    // Search against rest of the list (only forward to avoid double-counting)
    const otherCandidates = candidates.slice(i + 1);
    const matches = findPersonMatches(
      person.full_name,
      person.email,
      person.phone,
      otherCandidates
    );

    if (matches.length === 0) continue;

    // De-duplicate pairs
    const uniqueMatches = matches.filter((m) => {
      const pairKey = [person.id, m.existingId].sort().join(":");
      if (seenPairs.has(pairKey)) return false;
      seenPairs.add(pairKey);
      return true;
    });

    if (uniqueMatches.length > 0) {
      groups.push({
        person: {
          id: person.id,
          full_name: person.full_name,
          email: person.email,
          phone: person.phone,
          created_at: person.created_at,
        },
        matches: uniqueMatches.map((m) => ({
          ...m,
          created_at: createdAtMap.get(m.existingId) ?? null,
        })),
      });
    }
  }

  // Sort groups by highest match confidence
  groups.sort(
    (a, b) =>
      Math.max(...b.matches.map((m) => m.similarity)) -
      Math.max(...a.matches.map((m) => m.similarity))
  );

  return NextResponse.json({
    groups,
    totalProfiles: allProfiles.length,
    totalDuplicateGroups: groups.length,
  });
}
