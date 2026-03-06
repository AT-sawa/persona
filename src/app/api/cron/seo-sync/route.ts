import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchSearchConsoleData } from "@/lib/search-console";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/seo-sync
 * Daily sync of Google Search Console data into seo_keywords / seo_snapshots.
 * Runs at 03:00 UTC via Vercel Cron (configured in vercel.json).
 *
 * Also supports POST for manual trigger from the admin dashboard.
 */
async function handleSync(request: NextRequest) {
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
  const errors: string[] = [];
  let keywordsSynced = 0;
  let newKeywordsAdded = 0;

  try {
    // Determine date range: last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const startStr = fmt(startDate);
    const endStr = fmt(endDate);

    // 1. Fetch data from Google Search Console
    const rows = await fetchSearchConsoleData(startStr, endStr);

    if (rows.length === 0) {
      return NextResponse.json({
        syncedAt: new Date().toISOString(),
        keywordsSynced: 0,
        newKeywordsAdded: 0,
        errors: [],
        message: "No data returned from Search Console",
      });
    }

    // 2. Fetch all existing keywords from DB
    const { data: existingKeywords, error: kwFetchError } = await supabase
      .from("seo_keywords")
      .select("id, keyword");

    if (kwFetchError) {
      throw new Error(`Failed to fetch existing keywords: ${kwFetchError.message}`);
    }

    // Build a lookup map: keyword (lowercased) -> id
    const keywordMap = new Map<string, string>();
    for (const kw of existingKeywords ?? []) {
      keywordMap.set(kw.keyword.toLowerCase(), kw.id);
    }

    const today = fmt(new Date());

    // 3. Process each row from Search Console
    for (const row of rows) {
      try {
        const normalizedKeyword = row.keyword.trim().toLowerCase();
        let keywordId: string | undefined = keywordMap.get(normalizedKeyword);

        // Auto-create keyword if it doesn't exist
        if (!keywordId) {
          const { data: newKw, error: insertError } = await supabase
            .from("seo_keywords")
            .insert({
              keyword: row.keyword.trim(),
              is_primary: false,
              target_url: null,
            })
            .select("id")
            .single();

          if (insertError || !newKw) {
            errors.push(
              `Failed to create keyword "${row.keyword}": ${insertError?.message ?? "No data returned"}`
            );
            continue;
          }

          keywordId = newKw.id as string;
          keywordMap.set(normalizedKeyword, keywordId);
          newKeywordsAdded++;
        }

        // Upsert snapshot for today (source: search_console)
        // Use keyword_id + snapshot_date + source as the logical unique key.
        // First, check if a search_console snapshot already exists for today.
        const { data: existing } = await supabase
          .from("seo_snapshots")
          .select("id")
          .eq("keyword_id", keywordId)
          .eq("snapshot_date", today)
          .eq("source", "search_console")
          .maybeSingle();

        if (existing) {
          // Update existing snapshot
          const { error: updateError } = await supabase
            .from("seo_snapshots")
            .update({
              position: row.position,
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: row.ctr,
            })
            .eq("id", existing.id);

          if (updateError) {
            errors.push(
              `Failed to update snapshot for "${row.keyword}": ${updateError.message}`
            );
            continue;
          }
        } else {
          // Insert new snapshot
          const { error: insertError } = await supabase
            .from("seo_snapshots")
            .insert({
              keyword_id: keywordId,
              position: row.position,
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: row.ctr,
              snapshot_date: today,
              source: "search_console",
            });

          if (insertError) {
            errors.push(
              `Failed to insert snapshot for "${row.keyword}": ${insertError.message}`
            );
            continue;
          }
        }

        keywordsSynced++;
      } catch (rowError) {
        const msg =
          rowError instanceof Error ? rowError.message : String(rowError);
        errors.push(`Error processing "${row.keyword}": ${msg}`);
      }
    }

    return NextResponse.json({
      syncedAt: new Date().toISOString(),
      keywordsSynced,
      newKeywordsAdded,
      totalRowsFromAPI: rows.length,
      errors,
    });
  } catch (err) {
    console.error("SEO sync error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: "SEO sync failed",
        message,
        keywordsSynced,
        newKeywordsAdded,
        errors,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}
