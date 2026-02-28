import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  normalizeCaseTitle,
  combinedSimilarity,
  CASE_THRESHOLDS,
} from "@/lib/dedup";

/**
 * GET /api/admin/similar-cases?caseId=xxx
 * Find cases similar to the specified case for admin comparison.
 */
export async function GET(request: NextRequest) {
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

    const caseId = request.nextUrl.searchParams.get("caseId");
    if (!caseId) {
      return NextResponse.json(
        { error: "caseIdが必要です" },
        { status: 400 }
      );
    }

    // Get target case
    const { data: targetCase, error: caseError } = await supabase
      .from("cases")
      .select("id, title, case_no, fee, occupancy, location, must_req, description, industry, source, source_url, start_date, office_days, nice_to_have")
      .eq("id", caseId)
      .single();

    if (caseError || !targetCase) {
      return NextResponse.json(
        { error: "案件が見つかりません" },
        { status: 404 }
      );
    }

    const targetNormalized = normalizeCaseTitle(targetCase.title);

    // Get all other cases
    const { data: allCases } = await supabase
      .from("cases")
      .select("id, title, case_no, fee, occupancy, location, must_req, description, industry, source, source_url, start_date, office_days, nice_to_have")
      .neq("id", caseId);

    if (!allCases || allCases.length === 0) {
      return NextResponse.json({ similar: [] });
    }

    // Find similar cases
    const similar = allCases
      .map((c) => {
        const normalized = normalizeCaseTitle(c.title);
        const similarity = combinedSimilarity(targetNormalized, normalized);
        return { ...c, similarity };
      })
      .filter((c) => c.similarity >= CASE_THRESHOLDS.SIMILAR)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10); // Top 10

    return NextResponse.json({
      target: targetCase,
      similar,
    });
  } catch (err) {
    console.error("Similar cases error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
