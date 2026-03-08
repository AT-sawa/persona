import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runMatching, queueMatchingRun } from "@/lib/matching/runMatching";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/admin/matching
 * Admin manual trigger: immediately run matching for all users.
 *
 * Body (optional):
 *   targetUserId?: string  - Run for specific user only
 *   targetCaseId?: string  - Queue matching for specific case (async)
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const targetUserId = body.targetUserId || null;
    const targetCaseId = body.targetCaseId || null;

    // If targetCaseId is specified, queue async matching instead of running immediately
    if (targetCaseId) {
      await queueMatchingRun({
        triggerType: "case_create",
        targetCaseId,
        createdBy: user.id,
      });
      return NextResponse.json({ queued: true, targetCaseId });
    }

    const result = await runMatching({
      targetUserId,
      sendEmails: true,
      triggerType: "admin_manual",
    });

    await logAudit({
      action: "matching.manual_run",
      resourceType: "matching_results",
      details: {
        targetUserId,
        processed: result.processed,
        totalMatches: result.totalMatches,
        emailsSent: result.emailsSent,
        errors: result.errors.length,
      },
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Admin matching error:", err);
    return NextResponse.json(
      { error: "マッチング実行に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/matching
 * Get recent matching queue status for admin dashboard.
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

    const { data: queue } = await supabase
      .from("matching_queue")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(20);

    return NextResponse.json({ queue: queue || [] });
  } catch (err) {
    console.error("Matching queue fetch error:", err);
    return NextResponse.json(
      { error: "キュー取得に失敗しました" },
      { status: 500 }
    );
  }
}
