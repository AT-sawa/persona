import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  fetchGoogleSheet,
  importCasesFromSheet,
  extractSheetId,
} from "@/lib/sync-google-sheet";

/**
 * POST /api/admin/sync-sheet
 * Fetch a Google Sheet, preview or import cases.
 *
 * Body:
 *   sheetUrl: string       - Google Sheets URL
 *   sheetName?: string     - Optional sheet/tab name
 *   mode: "preview" | "import"
 *   publish?: boolean      - Publish immediately (default false)
 *   downloadPdfs?: boolean - Download linked PDFs (default true)
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
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

    const body = await request.json();
    const {
      sheetUrl,
      sheetName,
      mode = "preview",
      publish = false,
      downloadPdfs = true,
      onConflict = "skip",
    } = body;

    if (!sheetUrl) {
      return NextResponse.json(
        { error: "Google SheetsのURLを入力してください" },
        { status: 400 }
      );
    }

    // Validate URL
    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) {
      return NextResponse.json(
        { error: "無効なGoogle SheetsのURLです" },
        { status: 400 }
      );
    }

    // Fetch sheet data
    const { rows, columnMapping } = await fetchGoogleSheet(sheetUrl, sheetName);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "シートにデータが見つかりませんでした" },
        { status: 400 }
      );
    }

    // Preview mode: return parsed data without importing
    if (mode === "preview") {
      return NextResponse.json({
        total: rows.length,
        columnMapping,
        preview: rows.slice(0, 20),
      });
    }

    // Import mode: insert cases into database
    const result = await importCasesFromSheet(rows, {
      publish,
      downloadPdfs,
      onConflict,
      sourceUrl: sheetUrl,
    });

    result.columnMapping = columnMapping;

    await logAudit({
      action: "cases.sheet_sync",
      resourceType: "cases",
      details: {
        sheetUrl,
        sheetName,
        total: result.total,
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        flagged: result.flagged,
        errors: result.errors.length,
        publish,
        onConflict,
      },
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Sheet sync error:", err);
    const message =
      err instanceof Error ? err.message : "サーバーエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
