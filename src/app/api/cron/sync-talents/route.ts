import { NextRequest, NextResponse } from "next/server";
import { syncAllPartnerSheets } from "@/lib/sync-talent-sheet";

/**
 * GET /api/cron/sync-talents
 * Daily sync of external talent sheets from partner companies.
 * Runs at 21:00 UTC (06:00 JST) via Vercel Cron.
 *
 * READ-ONLY: only fetches data from Google Sheets, never writes back.
 * API-efficient: one CSV request per sheet per sync.
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

  try {
    const results = await syncAllPartnerSheets();

    const summary = {
      syncedAt: new Date().toISOString(),
      sources: results.length,
      totalInserted: results.reduce((s, r) => s + r.inserted, 0),
      totalUpdated: results.reduce((s, r) => s + r.updated, 0),
      totalDeactivated: results.reduce((s, r) => s + r.deactivated, 0),
      totalUnchanged: results.reduce((s, r) => s + r.unchanged, 0),
      totalErrors: results.reduce((s, r) => s + r.errors.length, 0),
      details: results,
    };

    console.log("[sync-talents]", JSON.stringify(summary));

    return NextResponse.json(summary);
  } catch (err) {
    console.error("[sync-talents] Fatal error:", err);
    return NextResponse.json(
      { error: "Sync failed", message: String(err) },
      { status: 500 }
    );
  }
}
