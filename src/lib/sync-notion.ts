/**
 * Notion database sync logic.
 * Fetches rows from a shared Notion database via the Notion API,
 * maps properties to case fields, and downloads linked PDFs.
 *
 * Dedup strategy:
 *   - Same source URL → skip or update existing
 *   - Different source URL → keep both, flag as similar
 */

import { createServiceClient } from "@/lib/supabase/service";
import {
  normalizeCaseTitle,
  computeSourceHash,
  findCaseMatch,
  prepareCaseCandidates,
  CASE_THRESHOLDS,
  type CaseMatchCandidate,
} from "@/lib/dedup";

const NOTION_API_VERSION = "2022-06-28";
const NOTION_API_BASE = "https://api.notion.com/v1";

// ── Property name aliases → case fields ──
const PROPERTY_MAP: Record<string, string> = {
  タイトル: "title",
  案件名: "title",
  案件タイトル: "title",
  名前: "title",
  Name: "title",
  案件番号: "case_no",
  No: "case_no",
  カテゴリ: "category",
  業界: "industry",
  業種: "industry",
  報酬: "fee",
  単価: "fee",
  月額: "fee",
  金額: "fee",
  稼働率: "occupancy",
  稼働: "occupancy",
  勤務地: "location",
  場所: "location",
  出社: "office_days",
  出社日数: "office_days",
  リモート: "office_days",
  勤務形態: "office_days",
  開始日: "start_date",
  開始時期: "start_date",
  期間: "start_date",
  延長: "extendable",
  延長可否: "extendable",
  案件背景: "background",
  背景: "background",
  概要: "background",
  業務内容: "description",
  内容: "description",
  説明: "description",
  必須要件: "must_req",
  必須スキル: "must_req",
  歓迎要件: "nice_to_have",
  歓迎スキル: "nice_to_have",
  選考フロー: "flow",
  選考: "flow",
  PDF: "pdf_url",
  資料: "pdf_url",
  詳細資料: "pdf_url",
  添付: "pdf_url",
  ステータス: "_status",
  状態: "_status",
  Status: "_status",
  title: "title",
  Title: "title",
  case_no: "case_no",
  category: "category",
  industry: "industry",
  fee: "fee",
  occupancy: "occupancy",
  location: "location",
  office_days: "office_days",
  start_date: "start_date",
  extendable: "extendable",
  background: "background",
  description: "description",
  must_req: "must_req",
  nice_to_have: "nice_to_have",
  flow: "flow",
  pdf_url: "pdf_url",
  pdf: "pdf_url",
};

/**
 * Extract a Notion database ID from various URL formats.
 */
export function extractNotionDatabaseId(url: string): string | null {
  const cleanUrl = url.split("?")[0];
  const match = cleanUrl.match(/([a-f0-9]{32})/i);
  if (!match) {
    const uuidMatch = cleanUrl.match(
      /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i
    );
    if (uuidMatch) return uuidMatch[1].replace(/-/g, "");
    return null;
  }
  return match[1];
}

function formatDatabaseId(id: string): string {
  const clean = id.replace(/-/g, "");
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(
    12,
    16
  )}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

function richTextToString(
  richTexts: Array<{ plain_text: string }> | undefined
): string {
  if (!richTexts || !Array.isArray(richTexts)) return "";
  return richTexts.map((t) => t.plain_text).join("");
}

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
        if (prop.rollup.type === "array")
          return `${prop.rollup.array?.length || 0}件`;
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

  const firstPage = allPages[0];
  const columnMapping: Record<string, string> = {};
  const propertyNames = Object.keys(firstPage.properties || {});

  for (const propName of propertyNames) {
    const mapped = PROPERTY_MAP[propName] || PROPERTY_MAP[propName.trim()];
    if (mapped) {
      columnMapping[propName] = mapped;
    }
  }

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
  updated: number;
  skipped: number;
  flagged: number;
  errors: string[];
  columnMapping: Record<string, string>;
  duplicateFlags?: Array<{
    incomingTitle: string;
    existingTitle: string;
    existingId: string;
    similarity: number;
    matchType: string;
    sameSource: boolean;
  }>;
}

/**
 * Build case insert/update payload with source tracking.
 */
function buildCasePayload(
  row: Record<string, string>,
  meta: {
    source: string;
    sourceUrl: string;
    pdfPath?: string | null;
    publish?: boolean;
  }
): Record<string, unknown> {
  return {
    case_no: row.case_no || null,
    title: row.title,
    title_normalized: normalizeCaseTitle(row.title),
    category: row.category || null,
    background: row.background || null,
    description: row.description
      ? `${row.description}${meta.pdfPath ? "\n\n[詳細資料あり]" : ""}`
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
    source: meta.source,
    source_url: meta.sourceUrl,
    synced_at: new Date().toISOString(),
    source_hash: computeSourceHash(row),
    ...(meta.publish !== undefined
      ? { is_active: meta.publish, status: meta.publish ? "active" : "draft" }
      : {}),
  };
}

/**
 * Import cases from Notion database rows with dedup.
 */
export async function importCasesFromNotion(
  rows: Record<string, string>[],
  options: {
    publish?: boolean;
    downloadPdfs?: boolean;
    onConflict?: "skip" | "update";
    sourceUrl?: string;
  } = {}
): Promise<NotionSyncResult> {
  const {
    publish = false,
    downloadPdfs = true,
    onConflict = "skip",
    sourceUrl = "",
  } = options;
  const supabase = createServiceClient();

  const result: NotionSyncResult = {
    total: rows.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    flagged: 0,
    errors: [],
    columnMapping: {},
    duplicateFlags: [],
  };

  // Load all existing cases
  const { data: existingRaw } = await supabase
    .from("cases")
    .select("id, title, case_no, source_url");

  const existingCases: CaseMatchCandidate[] = prepareCaseCandidates(
    existingRaw || []
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const title = row.title;

    if (!title) {
      result.skipped++;
      continue;
    }

    const match = findCaseMatch(
      title,
      row.case_no || null,
      sourceUrl,
      existingCases
    );

    if (match) {
      if (match.sameSource && match.similarity >= CASE_THRESHOLDS.AUTO_MATCH) {
        if (onConflict === "update") {
          const updatePayload = buildCasePayload(row, {
            source: "notion",
            sourceUrl,
          });
          const { error } = await supabase
            .from("cases")
            .update(updatePayload)
            .eq("id", match.existingId);
          if (error) {
            result.errors.push(`行${i + 1}: 更新失敗 - ${error.message}`);
          } else {
            result.updated++;
          }
        } else {
          result.skipped++;
        }
        continue;
      }

      if (!match.sameSource && match.similarity >= CASE_THRESHOLDS.SIMILAR) {
        result.flagged++;
        result.duplicateFlags!.push({
          incomingTitle: title,
          existingTitle: match.existingTitle,
          existingId: match.existingId,
          similarity: Math.round(match.similarity * 100) / 100,
          matchType: match.matchType,
          sameSource: false,
        });
        // Fall through to import
      }

      if (
        match.sameSource &&
        match.similarity >= CASE_THRESHOLDS.SIMILAR &&
        match.similarity < CASE_THRESHOLDS.AUTO_MATCH
      ) {
        if (onConflict === "update") {
          const updatePayload = buildCasePayload(row, {
            source: "notion",
            sourceUrl,
          });
          const { error } = await supabase
            .from("cases")
            .update(updatePayload)
            .eq("id", match.existingId);
          if (error) {
            result.errors.push(`行${i + 1}: 更新失敗 - ${error.message}`);
          } else {
            result.updated++;
          }
        } else {
          result.skipped++;
        }
        continue;
      }
    }

    // Insert new case
    let pdfPath: string | null = null;
    if (downloadPdfs && row.pdf_url) {
      pdfPath = await downloadAndStorePDF(row.pdf_url, title);
    }

    const insertPayload = buildCasePayload(row, {
      source: "notion",
      sourceUrl,
      pdfPath,
      publish,
    });

    const { data: inserted, error: insertError } = await supabase
      .from("cases")
      .insert(insertPayload)
      .select("id, title, case_no, source_url")
      .single();

    if (insertError) {
      result.errors.push(`行${i + 1}: ${insertError.message}`);
    } else {
      result.imported++;
      existingCases.push({
        id: inserted.id,
        title: inserted.title,
        case_no: inserted.case_no,
        source_url: inserted.source_url,
        normalizedTitle: normalizeCaseTitle(inserted.title),
      });
    }
  }

  return result;
}
