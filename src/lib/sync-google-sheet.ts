/**
 * Google Sheets sync logic.
 * Fetches data from public/link-shared Google Sheets as CSV,
 * parses rows into case records, and downloads linked PDFs.
 */

import { createServiceClient } from "@/lib/supabase/service";

// ── Column name aliases (Japanese ↔ English) ──
const COLUMN_MAP: Record<string, string> = {
  // Japanese labels
  "タイトル": "title",
  "案件名": "title",
  "案件タイトル": "title",
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
  // English labels
  "title": "title",
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
 * Extract Google Sheet ID from various URL formats.
 */
export function extractSheetId(url: string): string | null {
  // https://docs.google.com/spreadsheets/d/{ID}/edit...
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * Parse CSV text into an array of objects.
 * Handles quoted fields, newlines within quotes, and UTF-8 BOM.
 */
function parseCSV(text: string): Record<string, string>[] {
  // Remove BOM
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

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"/, "").replace(/"$/, ""));

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
): { mapped: Record<string, string>[]; columnMapping: Record<string, string> } {
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
 * Returns the storage path or null on failure.
 */
async function downloadAndStorePDF(
  pdfUrl: string,
  caseTitle: string
): Promise<string | null> {
  try {
    // Handle Google Drive links
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
    if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
      // Not a PDF, skip
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 100) return null; // Too small to be a valid PDF

    // Generate filename
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
  skipped: number;
  errors: string[];
  columnMapping: Record<string, string>;
  preview?: Record<string, string>[];
}

/**
 * Fetch a Google Sheet as CSV.
 */
export async function fetchGoogleSheet(
  sheetUrl: string,
  sheetName?: string
): Promise<{ rows: Record<string, string>[]; columnMapping: Record<string, string> }> {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) throw new Error("無効なGoogle SheetsのURLです");

  // Build CSV export URL
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
      throw new Error("スプレッドシートが見つかりません。URLとアクセス権限を確認してください。");
    }
    throw new Error(`シートの取得に失敗しました (${response.status})`);
  }

  const csvText = await response.text();
  const rawRows = parseCSV(csvText);
  const { mapped, columnMapping } = mapColumns(rawRows);

  return { rows: mapped, columnMapping };
}

/**
 * Import cases from fetched sheet data.
 * Downloads PDFs and creates case records.
 */
export async function importCasesFromSheet(
  rows: Record<string, string>[],
  options: { publish?: boolean; downloadPdfs?: boolean } = {}
): Promise<SheetSyncResult> {
  const { publish = false, downloadPdfs = true } = options;
  const supabase = createServiceClient();
  const result: SheetSyncResult = {
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

    // Check for duplicate by title
    const { data: existing } = await supabase
      .from("cases")
      .select("id")
      .eq("title", title)
      .limit(1);

    if (existing && existing.length > 0) {
      result.skipped++;
      continue;
    }

    // Handle PDF download
    let pdfPath: string | null = null;
    if (downloadPdfs && row.pdf_url) {
      pdfPath = await downloadAndStorePDF(row.pdf_url, title);
    }

    // Insert case
    const { error: insertError } = await supabase.from("cases").insert({
      case_no: row.case_no || null,
      title,
      category: row.category || null,
      background: row.background || null,
      description: row.description ? `${row.description}${pdfPath ? `\n\n[詳細資料あり]` : ""}` : null,
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
      result.errors.push(`行${i + 2}: ${insertError.message}`);
    } else {
      result.imported++;
    }
  }

  return result;
}
