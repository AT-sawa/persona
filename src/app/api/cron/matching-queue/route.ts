import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { runMatching } from "@/lib/matching/runMatching";

/**
 * GET /api/cron/matching-queue
 * Process pending matching requests from the queue.
 *
 * Debounce logic:
 *   - For "sync" triggers: wait 5 minutes after the last request
 *     (if more imports happen, the timer resets)
 *   - For "manual" / "user_register" / "user_update": process immediately
 *
 * Called by Vercel Cron every 15 minutes.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
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

  const supabase = createServiceClient();
  const results: Array<{
    queueId: string;
    triggerType: string;
    result: Record<string, unknown>;
  }> = [];

  try {
    // Fetch all pending requests
    const { data: pendingItems } = await supabase
      .from("matching_queue")
      .select("*")
      .eq("status", "pending")
      .order("requested_at", { ascending: true });

    if (!pendingItems || pendingItems.length === 0) {
      return NextResponse.json({ message: "No pending items", processed: 0 });
    }

    const now = Date.now();
    const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

    for (const item of pendingItems) {
      // Debounce check for sync triggers
      if (item.trigger_type === "sync") {
        const requestedAt = new Date(item.requested_at).getTime();
        const elapsed = now - requestedAt;

        if (elapsed < SYNC_COOLDOWN_MS) {
          // Not enough time has passed — skip for now
          continue;
        }
      }

      // Mark as processing
      await supabase
        .from("matching_queue")
        .update({
          status: "processing",
          started_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      try {
        // Run matching
        const matchResult = await runMatching({
          targetUserId: item.target_user_id || null,
          sendEmails: true,
          triggerType: item.trigger_type,
        });

        // Mark as completed
        await supabase
          .from("matching_queue")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            result: matchResult as unknown as Record<string, unknown>,
          })
          .eq("id", item.id);

        results.push({
          queueId: item.id,
          triggerType: item.trigger_type,
          result: matchResult as unknown as Record<string, unknown>,
        });
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Unknown error";

        await supabase
          .from("matching_queue")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            result: { error: errorMsg },
          })
          .eq("id", item.id);
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (err) {
    console.error("Matching queue error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
