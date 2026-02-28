import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  fetchNotionDatabase,
  importCasesFromNotion,
  extractNotionDatabaseId,
} from "@/lib/sync-notion";

/**
 * POST /api/admin/sync-notion
 * Fetch a Notion database, preview or import cases.
 *
 * Body:
 *   databaseUrl: string    - Notion database URL
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

    // Check NOTION_API_KEY
    if (!process.env.NOTION_API_KEY) {
      return NextResponse.json(
        {
          error:
            "NOTION_API_KEYが設定されていません。Vercelの環境変数に追加してください。",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      databaseUrl,
      mode = "preview",
      publish = false,
      downloadPdfs = true,
      onConflict = "skip",
    } = body;

    if (!databaseUrl) {
      return NextResponse.json(
        { error: "NotionデータベースのURLを入力してください" },
        { status: 400 }
      );
    }

    // Validate URL
    const dbId = extractNotionDatabaseId(databaseUrl);
    if (!dbId) {
      return NextResponse.json(
        { error: "無効なNotionデータベースのURLです" },
        { status: 400 }
      );
    }

    // Fetch database
    const { rows, columnMapping } = await fetchNotionDatabase(databaseUrl);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "データベースにデータが見つかりませんでした" },
        { status: 400 }
      );
    }

    // Preview mode
    if (mode === "preview") {
      return NextResponse.json({
        total: rows.length,
        columnMapping,
        preview: rows.slice(0, 20),
      });
    }

    // Import mode
    const result = await importCasesFromNotion(rows, {
      publish,
      downloadPdfs,
      onConflict,
      sourceUrl: databaseUrl,
    });

    result.columnMapping = columnMapping;

    await logAudit({
      action: "cases.notion_sync",
      resourceType: "cases",
      details: {
        databaseUrl,
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
    console.error("Notion sync error:", err);
    const message =
      err instanceof Error ? err.message : "サーバーエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
