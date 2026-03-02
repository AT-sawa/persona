import { NextRequest, NextResponse } from "next/server";
import { syncAllPartnerSheets } from "@/lib/sync-talent-sheet";
import { syncTalentNotion, type NotionTalentSyncResult } from "@/lib/sync-talent-notion";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GET /api/cron/sync-talents
 * Daily sync of external talent data from partner companies.
 * Supports both Google Sheets and Notion sources.
 * Runs at 21:00 UTC (06:00 JST) via Vercel Cron.
 *
 * READ-ONLY: only fetches data from external sources, never writes back.
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
    // 1. Sync Google Sheet sources
    const sheetResults = await syncAllPartnerSheets();

    // 2. Sync Notion sources (only if NOTION_API_KEY is configured)
    const notionResults: NotionTalentSyncResult[] = [];

    if (process.env.NOTION_API_KEY) {
      const supabase = createServiceClient();
      const { data: notionSources } = await supabase
        .from("partner_sheet_sources")
        .select("*")
        .eq("sync_enabled", true)
        .eq("source_type", "notion");

      if (notionSources && notionSources.length > 0) {
        for (const source of notionSources) {
          const result = await syncTalentNotion(source);
          notionResults.push(result);
        }
      }
    }

    // Combine results
    const allResults = [
      ...sheetResults.map((r) => ({ ...r, sourceType: "google_sheet" as const })),
      ...notionResults.map((r) => ({ ...r, sourceType: "notion" as const })),
    ];

    const summary = {
      syncedAt: new Date().toISOString(),
      sources: allResults.length,
      totalInserted: allResults.reduce((s, r) => s + r.inserted, 0),
      totalUpdated: allResults.reduce((s, r) => s + r.updated, 0),
      totalDeactivated: allResults.reduce((s, r) => s + r.deactivated, 0),
      totalUnchanged: allResults.reduce((s, r) => s + r.unchanged, 0),
      totalErrors: allResults.reduce((s, r) => s + r.errors.length, 0),
      details: allResults,
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
