import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchSearchConsoleData } from "@/lib/search-console";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/seo-sync
 * Manual trigger of Search Console sync from admin dashboard.
 * Uses Supabase admin auth instead of CRON_SECRET.
 */
export async function POST() {
  // 1. Verify admin auth
  const { createClient } = await import("@/lib/supabase/server");
  const supabaseAuth = await createClient();

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseAuth
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Run the sync logic (same as cron/seo-sync)
  const supabase = createServiceClient();
  const errors: string[] = [];
  let keywordsSynced = 0;
  let newKeywordsAdded = 0;

  try {
    // Date range: last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const startStr = fmt(startDate);
    const endStr = fmt(endDate);

    // Fetch data from Google Search Console
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

    // Fetch all existing keywords from DB
    const { data: existingKeywords, error: kwFetchError } = await supabase
      .from("seo_keywords")
      .select("id, keyword");

    if (kwFetchError) {
      throw new Error(
        `Failed to fetch existing keywords: ${kwFetchError.message}`
      );
    }

    // Build lookup map: keyword (lowercased) -> id
    const keywordMap = new Map<string, string>();
    for (const kw of existingKeywords ?? []) {
      keywordMap.set(kw.keyword.toLowerCase(), kw.id);
    }

    const today = fmt(new Date());

    // Process each row from Search Console
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

        // Upsert snapshot for today
        const { data: existing } = await supabase
          .from("seo_snapshots")
          .select("id")
          .eq("keyword_id", keywordId)
          .eq("snapshot_date", today)
          .eq("source", "search_console")
          .maybeSingle();

        if (existing) {
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
