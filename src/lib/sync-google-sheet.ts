/**
 * Google Sheets sync logic.
 * Fetches data from public/link-shared Google Sheets as CSV,
 * parses rows into case records, and downloads linked PDFs.
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

// ── Column name aliases (Japanese ↔ English) ──
const COLUMN_MAP: Record<string, string> = {
  // Japanese labels
  タイトル: "title",
  案件名: "title",
  案件タイトル: "title",
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
  // English labels
  title: "title",
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
 * Extract Google Sheet ID from various URL formats.
 */
export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Parse CSV text into an array of objects.
 */
function parseCSV(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '"') {
      if (inQuotes && clean[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "\n" && !inQuotes) {
      lines.push(current);
      current = "";
    } else if (char === "\r" && !inQuotes) {
      // skip
    } else {
      current += char;
    }
  }
  if (current.trim()) lines.push(current);

  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"/, "").replace(/"$/, ""));

  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let val = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') {
          val += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (c === "," && !inQ) {
        values.push(val.trim());
        val = "";
      } else {
        val += c;
      }
    }
    values.push(val.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) row[h] = values[idx] || "";
    });
    return row;
  });
}

/**
 * Map raw spreadsheet column names to case field names.
 */
function mapColumns(
  rows: Record<string, string>[]
): {
  mapped: Record<string, string>[];
  columnMapping: Record<string, string>;
} {
  if (rows.length === 0) return { mapped: [], columnMapping: {} };

  const rawHeaders = Object.keys(rows[0]);
  const columnMapping: Record<string, string> = {};

  for (const rawHeader of rawHeaders) {
    const normalized = rawHeader.trim().replace(/\s+/g, "");
    const mapped = COLUMN_MAP[normalized] || COLUMN_MAP[rawHeader.trim()];
    if (mapped) {
      columnMapping[rawHeader] = mapped;
    }
  }

  const mapped = rows.map((row) => {
    const result: Record<string, string> = {};
    for (const [rawHeader, value] of Object.entries(row)) {
      const fieldName = columnMapping[rawHeader];
      if (fieldName && value) {
        result[fieldName] = value;
      }
    }
    return result;
  });

  return { mapped, columnMapping };
}

/**
 * Download a PDF from URL and store in Supabase Storage.
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

export interface SheetSyncResult {
  total: number;
  imported: number;
  updated: number;
  skipped: number;
  flagged: number;
  errors: string[];
  columnMapping: Record<string, string>;
  preview?: Record<string, string>[];
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
 * Fetch a Google Sheet as CSV.
 */
export async function fetchGoogleSheet(
  sheetUrl: string,
  sheetName?: string
): Promise<{
  rows: Record<string, string>[];
  columnMapping: Record<string, string>;
}> {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) throw new Error("無効なGoogle SheetsのURLです");

  let csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  if (sheetName) {
    csvUrl += `&sheet=${encodeURIComponent(sheetName)}`;
  }

  const response = await fetch(csvUrl, {
    headers: { "User-Agent": "PERSONA-CaseSync/1.0" },
    redirect: "follow",
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        "スプレッドシートが見つかりません。URLとアクセス権限を確認してください。"
      );
    }
    throw new Error(`シートの取得に失敗しました (${response.status})`);
  }

  const csvText = await response.text();
  const rawRows = parseCSV(csvText);
  const { mapped, columnMapping } = mapColumns(rawRows);

  return { rows: mapped, columnMapping };
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
 * Import cases from fetched sheet data with dedup.
 *
 * Dedup rules:
 *   - Same source + match ≥ 0.90 → skip or update
 *   - Different source + match ≥ 0.70 → import but flag for comparison
 *   - No match → new import
 */
export async function importCasesFromSheet(
  rows: Record<string, string>[],
  options: {
    publish?: boolean;
    downloadPdfs?: boolean;
    onConflict?: "skip" | "update";
    sourceUrl?: string;
  } = {}
): Promise<SheetSyncResult> {
  const {
    publish = false,
    downloadPdfs = true,
    onConflict = "skip",
    sourceUrl = "",
  } = options;
  const supabase = createServiceClient();

  const result: SheetSyncResult = {
    total: rows.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    flagged: 0,
    errors: [],
    columnMapping: {},
    duplicateFlags: [],
  };

  // Load all existing cases for matching
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

    // Find match
    const match = findCaseMatch(
      title,
      row.case_no || null,
      sourceUrl,
      existingCases
    );

    if (match) {
      if (match.sameSource && match.similarity >= CASE_THRESHOLDS.AUTO_MATCH) {
        // ── Same source, high match → skip or update ──
        if (onConflict === "update") {
          const updatePayload = buildCasePayload(row, {
            source: "google_sheet",
            sourceUrl,
          });
          const { error } = await supabase
            .from("cases")
            .update(updatePayload)
            .eq("id", match.existingId);

          if (error) {
            result.errors.push(
              `行${i + 2}: 更新失敗 - ${error.message}`
            );
          } else {
            result.updated++;
          }
        } else {
          result.skipped++;
        }
        continue;
      }

      if (
        !match.sameSource &&
        match.similarity >= CASE_THRESHOLDS.SIMILAR
      ) {
        // ── Different source, similar → import AND flag ──
        result.flagged++;
        result.duplicateFlags!.push({
          incomingTitle: title,
          existingTitle: match.existingTitle,
          existingId: match.existingId,
          similarity: Math.round(match.similarity * 100) / 100,
          matchType: match.matchType,
          sameSource: false,
        });
        // Fall through to import below
      }

      if (
        match.sameSource &&
        match.similarity >= CASE_THRESHOLDS.SIMILAR &&
        match.similarity < CASE_THRESHOLDS.AUTO_MATCH
      ) {
        // ── Same source, fuzzy match (0.70-0.90) → treat as same, skip/update ──
        if (onConflict === "update") {
          const updatePayload = buildCasePayload(row, {
            source: "google_sheet",
            sourceUrl,
          });
          const { error } = await supabase
            .from("cases")
            .update(updatePayload)
            .eq("id", match.existingId);
          if (error) {
            result.errors.push(
              `行${i + 2}: 更新失敗 - ${error.message}`
            );
          } else {
            result.updated++;
          }
        } else {
          result.skipped++;
        }
        continue;
      }
    }

    // ── New case or flagged from different source → insert ──
    let pdfPath: string | null = null;
    if (downloadPdfs && row.pdf_url) {
      pdfPath = await downloadAndStorePDF(row.pdf_url, title);
    }

    const insertPayload = buildCasePayload(row, {
      source: "google_sheet",
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
      result.errors.push(`行${i + 2}: ${insertError.message}`);
    } else {
      result.imported++;
      // Add to in-memory index for batch-internal dedup
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
