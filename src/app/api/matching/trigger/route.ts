import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runMatching } from "@/lib/matching/runMatching";

/**
 * POST /api/matching/trigger
 * Trigger matching for the current authenticated user.
 * Called after profile or preference updates.
 *
 * This runs immediately (no debounce) since it's a single-user operation.
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

    const result = await runMatching({
      targetUserId: user.id,
      sendEmails: false, // Don't email on self-triggered matching
      triggerType: "user_update",
    });

    return NextResponse.json({
      success: true,
      matches: result.totalMatches,
    });
  } catch (err) {
    console.error("User matching trigger error:", err);
    return NextResponse.json(
      { error: "マッチング実行に失敗しました" },
      { status: 500 }
    );
  }
}
