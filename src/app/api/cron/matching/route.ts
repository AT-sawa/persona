import { NextRequest, NextResponse } from "next/server";
import { runMatching } from "@/lib/matching/runMatching";

/**
 * GET /api/cron/matching
 * Daily batch matching for all active users.
 * Runs at 22:00 UTC (07:00 JST) via Vercel Cron.
 *
 * Now delegates to the shared runMatching service.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (fail-closed: reject if not configured or too short)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 32) {
    console.error("CRON_SECRET is not configured or too short");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMatching({
    targetUserId: null,
    sendEmails: true,
    triggerType: "daily_cron",
  });

  return NextResponse.json(result);
}
