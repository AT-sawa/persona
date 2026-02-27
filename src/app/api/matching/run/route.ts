import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateScore } from "@/lib/matching/calculateScore";
import type { Case, Profile, UserPreferences, UserExperience } from "@/lib/types";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user data
    const [profileRes, prefsRes, expsRes, casesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("user_experiences")
        .select("*")
        .eq("user_id", user.id),
      supabase
        .from("cases")
        .select("*")
        .eq("is_active", true),
    ]);

    const profile = profileRes.data as Profile | null;
    if (!profile) {
      return NextResponse.json(
        { error: "プロフィールが見つかりません" },
        { status: 404 }
      );
    }

    const preferences = prefsRes.data as UserPreferences | null;
    const experiences = (expsRes.data as UserExperience[]) ?? [];
    const cases = (casesRes.data as Case[]) ?? [];

    if (cases.length === 0) {
      return NextResponse.json({ results: [], count: 0 });
    }

    // Calculate scores for all active cases
    const results = cases.map((c) => {
      const { score, factors } = calculateScore(
        c,
        profile,
        preferences,
        experiences
      );
      return {
        case_id: c.id,
        user_id: user.id,
        score,
        factors,
      };
    });

    // Filter low scores (below 20)
    const filtered = results.filter((r) => r.score > 20);

    // Sort by score descending
    filtered.sort((a, b) => b.score - a.score);

    // Upsert into matching_results using service role
    const serviceClient = createServiceClient();

    if (filtered.length > 0) {
      const { error: upsertError } = await serviceClient
        .from("matching_results")
        .upsert(
          filtered.map((r) => ({
            case_id: r.case_id,
            user_id: r.user_id,
            score: r.score,
            factors: r.factors,
            matched_at: new Date().toISOString(),
          })),
          { onConflict: "case_id,user_id" }
        );

      if (upsertError) {
        console.error("Matching upsert error:", upsertError);
      }
    }

    // Delete old results for cases no longer matching
    const matchedCaseIds = filtered.map((r) => r.case_id);
    if (matchedCaseIds.length > 0) {
      await serviceClient
        .from("matching_results")
        .delete()
        .eq("user_id", user.id)
        .not("case_id", "in", `(${matchedCaseIds.join(",")})`);
    }

    return NextResponse.json({
      results: filtered.slice(0, 30),
      count: filtered.length,
    });
  } catch (err) {
    console.error("Matching error:", err);
    return NextResponse.json(
      { error: "マッチング計算に失敗しました" },
      { status: 500 }
    );
  }
}
