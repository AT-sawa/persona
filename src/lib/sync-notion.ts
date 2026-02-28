/**
 * Notion database sync logic.
 * Fetches rows from a shared Notion database via the Notion API,
 * maps properties to case fields, and downloads linked PDFs.
 *
 * Requirements:
 *   - NOTION_API_KEY env var (internal integration token)
 *   - Database must be shared with the PERSONA integration in Notion
 */

import { createServiceClient } from "@/lib/supabase/service";

const NOTION_API_VERSION = "2022-06-28";
const NOTION_API_BASE = "https://api.notion.com/v1";

// ── Property name aliases → case fields ──
const PROPERTY_MAP: Record<string, string> = {
  // Japanese
  "タイトル": "title",
  "案件名": "title",
  "案件タイトル": "title",
  "名前": "title",
  "Name": "title",
  "案件番号": "case_no",
  "No": "case_no",
  "カテゴリ": "category",
  "業界": "industry",
  "業種": "industry",
  "報酬": "fee",
  "単価": "fee",
  "月額": "fee",
  "金額": "fee",
  "稼働率": "occupancy",
  "稼働": "occupancy",
  "勤務地": "location",
  "場所": "location",
  "出社": "office_days",
  "出社日数": "office_days",
  "リモート": "office_days",
  "勤務形態": "office_days",
  "開始日": "start_date",
  "開始時期": "start_date",
  "期間": "start_date",
  "延長": "extendable",
  "延長可否": "extendable",
  "案件背景": "background",
  "背景": "background",
  "概要": "background",
  "業務内容": "description",
  "内容": "description",
  "説明": "description",
  "必須要件": "must_req",
  "必須スキル": "must_req",
  "歓迎要件": "nice_to_have",
  "歓迎スキル": "nice_to_have",
  "選考フロー": "flow",
  "選考": "flow",
  "PDF": "pdf_url",
  "資料": "pdf_url",
  "詳細資料": "pdf_url",
  "添付": "pdf_url",
  "ステータス": "_status",
  "状態": "_status",
  "Status": "_status",
  // English
  "title": "title",
  "Title": "title",
  "case_no": "case_no",
  "category": "category",
  "industry": "industry",
  "fee": "fee",
  "occupancy": "occupancy",
  "location": "location",
  "office_days": "office_days",
  "start_date": "start_date",
  "extendable": "extendable",
  "background": "background",
  "description": "description",
  "must_req": "must_req",
  "nice_to_have": "nice_to_have",
  "flow": "flow",
  "pdf_url": "pdf_url",
  "pdf": "pdf_url",
};

/**
 * Extract a Notion database ID from various URL formats.
 * e.g. https://www.notion.so/workspace/abc123def456...?v=xxx
 * or   https://www.notion.so/abc123def456...
 */
export function extractNotionDatabaseId(url: string): string | null {
  // Remove query params
  const cleanUrl = url.split("?")[0];
  // Match 32-char hex ID (with or without hyphens)
  const match = cleanUrl.match(/([a-f0-9]{32})/i);
  if (!match) {
    // Try hyphenated UUID format
    const uuidMatch = cleanUrl.match(
      /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
    );
    if (uuidMatch) return uuidMatch[1].replace(/-/g, "");
    return null;
  }
  return match[1];
}

/**
 * Format a database ID with hyphens for the API.
 */
function formatDatabaseId(id: string): string {
  const clean = id.replace(/-/g, "");
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(
    12,
    16
  )}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

/**
 * Extract plain text from a Notion rich text array.
 */
function richTextToString(
  richTexts: Array<{ plain_text: string }> | undefined
): string {
  if (!richTexts || !Array.isArray(richTexts)) return "";
  return richTexts.map((t) => t.plain_text).join("");
}

/**
 * Extract value from a Notion property based on its type.
 */
function extractPropertyValue(prop: {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}): string {
  if (!prop) return "";

  switch (prop.type) {
    case "title":
      return richTextToString(prop.title);
    case "rich_text":
      return richTextToString(prop.rich_text);
    case "number":
      return prop.number != null ? String(prop.number) : "";
    case "select":
      return prop.select?.name || "";
    case "multi_select":
      return (prop.multi_select || [])
        .map((s: { name: string }) => s.name)
        .join(", ");
    case "status":
      return prop.status?.name || "";
    case "date":
      return prop.date?.start || "";
    case "checkbox":
      return prop.checkbox ? "はい" : "いいえ";
    case "url":
      return prop.url || "";
    case "email":
      return prop.email || "";
    case "phone_number":
      return prop.phone_number || "";
    case "files":
      // Return first file URL
      if (prop.files && prop.files.length > 0) {
        const file = prop.files[0];
        return file.file?.url || file.external?.url || file.name || "";
      }
      return "";
    case "formula":
      if (prop.formula) {
        if (prop.formula.type === "string") return prop.formula.string || "";
        if (prop.formula.type === "number")
          return prop.formula.number != null
            ? String(prop.formula.number)
            : "";
        if (prop.formula.type === "boolean")
          return prop.formula.boolean ? "はい" : "いいえ";
        if (prop.formula.type === "date")
          return prop.formula.date?.start || "";
      }
      return "";
    case "rollup":
      if (prop.rollup) {
        if (prop.rollup.type === "number")
          return prop.rollup.number != null
            ? String(prop.rollup.number)
            : "";
        if (prop.rollup.type === "array") return `${prop.rollup.array?.length || 0}件`;
      }
      return "";
    case "relation":
      return (prop.relation || [])
        .map((r: { id: string }) => r.id)
        .join(", ");
    default:
      return "";
  }
}

// ── Notion API helpers ──

async function notionFetch(
  path: string,
  options: { method?: string; body?: unknown } = {}
) {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NOTION_API_KEYが設定されていません。環境変数を確認してください。"
    );
  }

  const res = await fetch(`${NOTION_API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_API_VERSION,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errBody = await res.text();
    if (res.status === 401) {
      throw new Error(
        "Notion APIの認証に失敗しました。トークンを確認してください。"
      );
    }
    if (res.status === 404) {
      throw new Error(
        "データベースが見つかりません。URLとインテグレーション共有を確認してください。"
      );
    }
    throw new Error(
      `Notion APIエラー (${res.status}): ${errBody.slice(0, 200)}`
    );
  }

  return res.json();
}

/**
 * Fetch all rows from a Notion database (handles pagination).
 */
export async function fetchNotionDatabase(
  databaseUrl: string
): Promise<{
  rows: Record<string, string>[];
  columnMapping: Record<string, string>;
}> {
  const dbId = extractNotionDatabaseId(databaseUrl);
  if (!dbId) throw new Error("無効なNotionデータベースのURLです");

  const formattedId = formatDatabaseId(dbId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPages: any[] = [];
  let startCursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = { page_size: 100 };
    if (startCursor) body.start_cursor = startCursor;

    const result = await notionFetch(`/databases/${formattedId}/query`, {
      method: "POST",
      body,
    });

    allPages.push(...(result.results || []));
    hasMore = result.has_more;
    startCursor = result.next_cursor;
  }

  if (allPages.length === 0) {
    return { rows: [], columnMapping: {} };
  }

  // Build column mapping from first page's properties
  const firstPage = allPages[0];
  const columnMapping: Record<string, string> = {};
  const propertyNames = Object.keys(firstPage.properties || {});

  for (const propName of propertyNames) {
    const mapped = PROPERTY_MAP[propName] || PROPERTY_MAP[propName.trim()];
    if (mapped) {
      columnMapping[propName] = mapped;
    }
  }

  // Convert pages to flat rows
  const rows = allPages.map((page) => {
    const row: Record<string, string> = {};

    for (const [propName, prop] of Object.entries(page.properties || {})) {
      const fieldName = columnMapping[propName];
      if (fieldName) {
        const value = extractPropertyValue(
          prop as { type: string; [key: string]: unknown }
        );
        if (value) row[fieldName] = value;
      }
    }

    return row;
  });

  return { rows, columnMapping };
}

/**
 * Download PDF from URL and store in Supabase Storage.
 */
async function downloadAndStorePDF(
  pdfUrl: string,
  caseTitle: string
): Promise<string | null> {
  try {
    let downloadUrl = pdfUrl;

    // Handle Google Drive links
    const driveMatch = pdfUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      downloadUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }

    const response = await fetch(downloadUrl, {
      redirect: "follow",
      headers: { "User-Agent": "PERSONA-CaseSync/1.0" },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (
      !contentType.includes("pdf") &&
      !contentType.includes("octet-stream")
    ) {
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 100) return null;

    const safeName = caseTitle
      .replace(/[^\w\u3000-\u9FFF]/g, "_")
      .slice(0, 50);
    const timestamp = Date.now();
    const filePath = `case-docs/${timestamp}_${safeName}.pdf`;

    const supabase = createServiceClient();

    const { error } = await supabase.storage
      .from("case-documents")
      .upload(filePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (error) {
      console.error("PDF upload error:", error.message);
      return null;
    }

    return filePath;
  } catch (err) {
    console.error("PDF download error:", err);
    return null;
  }
}

export interface NotionSyncResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
  columnMapping: Record<string, string>;
}

/**
 * Import cases from Notion database rows.
 */
export async function importCasesFromNotion(
  rows: Record<string, string>[],
  options: { publish?: boolean; downloadPdfs?: boolean } = {}
): Promise<NotionSyncResult> {
  const { publish = false, downloadPdfs = true } = options;
  const supabase = createServiceClient();
  const result: NotionSyncResult = {
    total: rows.length,
    imported: 0,
    skipped: 0,
    errors: [],
    columnMapping: {},
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const title = row.title;

    if (!title) {
      result.skipped++;
      continue;
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from("cases")
      .select("id")
      .eq("title", title)
      .limit(1);

    if (existing && existing.length > 0) {
      result.skipped++;
      continue;
    }

    // Download PDF if available
    let pdfPath: string | null = null;
    if (downloadPdfs && row.pdf_url) {
      pdfPath = await downloadAndStorePDF(row.pdf_url, title);
    }

    // Insert
    const { error: insertError } = await supabase.from("cases").insert({
      case_no: row.case_no || null,
      title,
      category: row.category || null,
      background: row.background || null,
      description: row.description
        ? `${row.description}${pdfPath ? "\n\n[詳細資料あり]" : ""}`
        : null,
      industry: row.industry || null,
      start_date: row.start_date || null,
      extendable: row.extendable || null,
      occupancy: row.occupancy || null,
      fee: row.fee || null,
      office_days: row.office_days || null,
      location: row.location || null,
      must_req: row.must_req || null,
      nice_to_have: row.nice_to_have || null,
      flow: row.flow || null,
      is_active: publish,
      status: publish ? "active" : "draft",
    });

    if (insertError) {
      result.errors.push(`行${i + 1}: ${insertError.message}`);
    } else {
      result.imported++;
    }
  }

  return result;
}
