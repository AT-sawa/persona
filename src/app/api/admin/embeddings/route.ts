import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  generateEmbedding,
  buildCaseEmbeddingText,
  buildProfileEmbeddingText,
} from "@/lib/embedding";
import type {
  Case,
  Profile,
  UserExperience,
  UserPreferences,
} from "@/lib/types";

/**
 * GET /api/admin/embeddings
 * Returns counts of total and embedded cases/profiles.
 */
export async function GET() {
  try {
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

    const serviceClient = createServiceClient();

    // Get total counts and embedded counts
    const [casesTotal, casesEmbedded, profilesTotal, profilesEmbedded] =
      await Promise.all([
        serviceClient
          .from("cases")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        serviceClient
          .from("cases")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .not("embedding", "is", null),
        serviceClient
          .from("profiles")
          .select("id", { count: "exact", head: true }),
        serviceClient
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .not("embedding", "is", null),
      ]);

    return NextResponse.json({
      cases_total: casesTotal.count ?? 0,
      cases_embedded: casesEmbedded.count ?? 0,
      profiles_total: profilesTotal.count ?? 0,
      profiles_embedded: profilesEmbedded.count ?? 0,
    });
  } catch (err) {
    console.error("Embeddings stats error:", err);
    return NextResponse.json(
      { error: "統計情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/embeddings
 * Batch-generate embeddings for unembedded cases and profiles.
 * Processes up to 50 cases + 50 profiles per call.
 */
export async function POST() {
  try {
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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY が設定されていません" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();
    let casesEmbedded = 0;
    let profilesEmbedded = 0;
    const errors: string[] = [];

    // --- Process cases ---
    const { data: unembeddedCases } = await serviceClient
      .from("cases")
      .select("*")
      .eq("is_active", true)
      .is("embedding", null)
      .limit(50);

    if (unembeddedCases && unembeddedCases.length > 0) {
      for (const c of unembeddedCases as Case[]) {
        try {
          const text = buildCaseEmbeddingText(c);
          if (!text.trim()) continue;

          const embedding = await generateEmbedding(text);
          if (embedding) {
            const { error: updateError } = await serviceClient
              .from("cases")
              .update({ embedding: JSON.stringify(embedding) })
              .eq("id", c.id);

            if (updateError) {
              errors.push(`Case ${c.id}: ${updateError.message}`);
            } else {
              casesEmbedded++;
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown";
          errors.push(`Case ${c.id}: ${msg}`);
        }
      }
    }

    // --- Process profiles ---
    const { data: unembeddedProfiles } = await serviceClient
      .from("profiles")
      .select("*")
      .is("embedding", null)
      .limit(50);

    if (unembeddedProfiles && unembeddedProfiles.length > 0) {
      for (const p of unembeddedProfiles as Profile[]) {
        try {
          // Fetch experiences and preferences for the profile
          const [expsRes, prefsRes] = await Promise.all([
            serviceClient
              .from("user_experiences")
              .select("*")
              .eq("user_id", p.id),
            serviceClient
              .from("user_preferences")
              .select("*")
              .eq("user_id", p.id)
              .single(),
          ]);

          const experiences = (expsRes.data as UserExperience[]) ?? [];
          const preferences = prefsRes.data as UserPreferences | null;

          const text = buildProfileEmbeddingText(p, experiences, preferences);
          if (!text.trim()) continue;

          const embedding = await generateEmbedding(text);
          if (embedding) {
            const { error: updateError } = await serviceClient
              .from("profiles")
              .update({ embedding: JSON.stringify(embedding) })
              .eq("id", p.id);

            if (updateError) {
              errors.push(`Profile ${p.id}: ${updateError.message}`);
            } else {
              profilesEmbedded++;
            }
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown";
          errors.push(`Profile ${p.id}: ${msg}`);
        }
      }
    }

    return NextResponse.json({
      cases_embedded: casesEmbedded,
      profiles_embedded: profilesEmbedded,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Embedding generation error:", err);
    return NextResponse.json(
      { error: "エンベディング生成に失敗しました" },
      { status: 500 }
    );
  }
}
