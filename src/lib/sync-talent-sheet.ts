/**
 * External talent sheet sync — READ-ONLY.
 *
 * Fetches partner company Google Sheets (personnel lists),
 * parses the data, and upserts into `external_talents` table.
 *
 * IMPORTANT:
 * - Never writes back to the Google Sheet
 * - Minimizes API calls (one CSV fetch per sheet per sync)
 * - Handles both standard (row = person) and transposed (column = person) layouts
 */

import { createServiceClient } from "@/lib/supabase/service";
import { computeSourceHash } from "@/lib/dedup";

// ── Types ──

interface PartnerSource {
  id: string;
  name: string;
  sheet_url: string;
  sheet_name: string | null;
  layout: "standard" | "transposed";
  field_mapping: {
    row_labels?: Record<string, string>;
    column_headers?: Record<string, string>;
    header_row?: number;
    data_start_column?: number;
    data_start_row?: number;
  };
  sync_enabled: boolean;
}

interface TalentRecord {
  source_name: string;
  source_sheet_url: string;
  source_row_key: string;
  name: string | null;
  availability_date: string | null;
  project_type: string | null;
  personnel_info: string | null;
  resume_url: string | null;
  raw_data: Record<string, string>;
  source_hash: string;
}

export interface TalentSyncResult {
  sourceName: string;
  total: number;
  inserted: number;
  updated: number;
  deactivated: number;
  unchanged: number;
  errors: string[];
}

// ── CSV Parsing (reusable) ──

function parseCSV(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '"') {
      if (inQuotes && clean[i + 1] === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if (char === "\n" && !inQuotes) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
    } else if (char === "\r" && !inQuotes) {
      // skip
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows;
}

// ── Sheet ID extraction ──

function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// ── Fetch sheet as CSV (one single HTTP request, no API key needed) ──

async function fetchSheetCSV(
  sheetUrl: string,
  sheetName?: string | null
): Promise<string[][]> {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) throw new Error("Invalid Google Sheet URL");

  let csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
  if (sheetName) {
    csvUrl += `&sheet=${encodeURIComponent(sheetName)}`;
  }

  const response = await fetch(csvUrl, {
    headers: { "User-Agent": "PERSONA-TalentSync/1.0" },
    next: { revalidate: 0 }, // no cache
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sheet (${response.status})`);
  }

  const csvText = await response.text();
  return parseCSV(csvText);
}

// ── Parse transposed layout ──
// Rows = fields, Columns = people
// Row 1: header indicator (e.g. "列")
// Row 2: meta row with "No", "行", "値"
// Row 3+: field data

function parseTransposedSheet(
  grid: string[][],
  fieldMapping: Record<string, string>,
  dataStartCol: number
): TalentRecord[] {
  if (grid.length < 3) return [];

  // Find how many columns have data (check row 2 which has No values)
  const headerRow = grid[1] || [];
  const maxCols = Math.max(...grid.map((r) => r.length));

  const talents: TalentRecord[] = [];

  // Each column from dataStartCol onwards = one person
  for (let col = dataStartCol; col < maxCols; col++) {
    // Check if this column has any non-empty data
    const hasData = grid.some(
      (row, rowIdx) => rowIdx >= 2 && row[col] && row[col].trim() !== ""
    );
    if (!hasData) continue;

    const raw: Record<string, string> = {};
    const record: Partial<TalentRecord> = {};

    // Column identifier (No from row 2, or column index)
    const colId = headerRow[col]?.trim() || `col_${col}`;
    record.source_row_key = colId;

    // Extract each field row
    for (let row = 2; row < grid.length; row++) {
      const fieldLabel = grid[row]?.[0]?.trim();
      if (!fieldLabel) continue;

      const value = grid[row]?.[col]?.trim() || "";
      if (!value) continue;

      raw[fieldLabel] = value;

      // Map to normalized fields
      const mappedField = fieldMapping[fieldLabel];
      if (mappedField) {
        switch (mappedField) {
          case "availability_date":
            record.availability_date = value;
            break;
          case "project_type":
            record.project_type = value;
            break;
          case "personnel_info":
            record.personnel_info = value;
            break;
          case "resume_url":
            record.resume_url = value;
            break;
          case "name":
            record.name = value;
            break;
        }
      }
    }

    // Try to extract name from personnel_info if not explicitly set
    if (!record.name && record.personnel_info) {
      // First line or first few characters often contain the name
      const firstLine = record.personnel_info.split(/[\n、,]/)[0]?.trim();
      if (firstLine && firstLine.length <= 20) {
        record.name = firstLine;
      }
    }

    talents.push({
      source_name: "", // filled by caller
      source_sheet_url: "", // filled by caller
      source_row_key: record.source_row_key || `col_${col}`,
      name: record.name || null,
      availability_date: record.availability_date || null,
      project_type: record.project_type || null,
      personnel_info: record.personnel_info || null,
      resume_url: record.resume_url || null,
      raw_data: raw,
      source_hash: computeSourceHash(raw),
    });
  }

  return talents;
}

// ── Parse standard layout ──
// Rows = people, Columns = fields

function parseStandardSheet(
  grid: string[][],
  fieldMapping: Record<string, string>,
  dataStartRow: number
): TalentRecord[] {
  if (grid.length < dataStartRow + 1) return [];

  // First row (or header row) = column headers
  const headers = grid[0] || [];
  const talents: TalentRecord[] = [];

  for (let row = dataStartRow; row < grid.length; row++) {
    const cells = grid[row];
    if (!cells || cells.every((c) => !c?.trim())) continue;

    const raw: Record<string, string> = {};
    const record: Partial<TalentRecord> = {};

    let rowKey = "";

    for (let col = 0; col < headers.length; col++) {
      const header = headers[col]?.trim();
      if (!header) continue;

      const value = cells[col]?.trim() || "";
      if (!value) continue;

      raw[header] = value;

      // Check field mapping
      const mappedField = fieldMapping[header];
      if (mappedField) {
        switch (mappedField) {
          case "availability_date":
            record.availability_date = value;
            break;
          case "project_type":
            record.project_type = value;
            break;
          case "personnel_info":
            record.personnel_info = value;
            break;
          case "resume_url":
            record.resume_url = value;
            break;
          case "name":
            record.name = value;
            break;
          case "row_key":
            rowKey = value;
            break;
        }
      }

      // Auto-detect common column names
      if (!mappedField) {
        const lowerHeader = header.toLowerCase();
        if (
          !record.name &&
          (lowerHeader.includes("名前") ||
            lowerHeader.includes("氏名") ||
            lowerHeader === "name")
        ) {
          record.name = value;
        }
        if (
          !rowKey &&
          (lowerHeader === "no" ||
            lowerHeader === "no." ||
            lowerHeader === "id")
        ) {
          rowKey = value;
        }
      }
    }

    talents.push({
      source_name: "",
      source_sheet_url: "",
      source_row_key: rowKey || `row_${row}`,
      name: record.name || null,
      availability_date: record.availability_date || null,
      project_type: record.project_type || null,
      personnel_info: record.personnel_info || null,
      resume_url: record.resume_url || null,
      raw_data: raw,
      source_hash: computeSourceHash(raw),
    });
  }

  return talents;
}

// ── Main sync function ──

export async function syncTalentSheet(
  source: PartnerSource
): Promise<TalentSyncResult> {
  const result: TalentSyncResult = {
    sourceName: source.name,
    total: 0,
    inserted: 0,
    updated: 0,
    deactivated: 0,
    unchanged: 0,
    errors: [],
  };

  try {
    // 1. Fetch CSV (single HTTP request)
    const grid = await fetchSheetCSV(source.sheet_url, source.sheet_name);

    if (grid.length === 0) {
      result.errors.push("シートにデータがありません");
      return result;
    }

    // 2. Parse based on layout
    let talents: TalentRecord[];

    if (source.layout === "transposed") {
      const fieldMapping = source.field_mapping.row_labels || {};
      const dataStartCol = source.field_mapping.data_start_column || 3;
      talents = parseTransposedSheet(grid, fieldMapping, dataStartCol);
    } else {
      const fieldMapping = source.field_mapping.column_headers || {};
      const dataStartRow = source.field_mapping.data_start_row || 1;
      talents = parseStandardSheet(grid, fieldMapping, dataStartRow);
    }

    // Fill source info
    for (const t of talents) {
      t.source_name = source.name;
      t.source_sheet_url = source.sheet_url;
    }

    result.total = talents.length;

    if (talents.length === 0) {
      return result; // No data yet — nothing to do
    }

    // 3. Get existing records for this source
    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from("external_talents")
      .select("id, source_row_key, source_hash, is_active")
      .eq("source_sheet_url", source.sheet_url);

    const existingMap = new Map(
      (existing || []).map((e) => [e.source_row_key, e])
    );

    // 4. Upsert each talent
    const processedKeys = new Set<string>();

    for (const talent of talents) {
      processedKeys.add(talent.source_row_key);
      const existingRecord = existingMap.get(talent.source_row_key);

      if (existingRecord) {
        // Record exists — check if content changed
        if (existingRecord.source_hash === talent.source_hash) {
          // No change — just update last_synced_at if inactive
          if (!existingRecord.is_active) {
            await supabase
              .from("external_talents")
              .update({ is_active: true, last_synced_at: new Date().toISOString() })
              .eq("id", existingRecord.id);
            result.updated++;
          } else {
            result.unchanged++;
          }
        } else {
          // Content changed → update
          const { error } = await supabase
            .from("external_talents")
            .update({
              name: talent.name,
              availability_date: talent.availability_date,
              project_type: talent.project_type,
              personnel_info: talent.personnel_info,
              resume_url: talent.resume_url,
              raw_data: talent.raw_data,
              source_hash: talent.source_hash,
              last_synced_at: new Date().toISOString(),
              is_active: true,
            })
            .eq("id", existingRecord.id);

          if (error) {
            result.errors.push(`更新失敗 [${talent.source_row_key}]: ${error.message}`);
          } else {
            result.updated++;
          }
        }
      } else {
        // New record → insert
        const { error } = await supabase.from("external_talents").insert({
          source_name: talent.source_name,
          source_sheet_url: talent.source_sheet_url,
          source_row_key: talent.source_row_key,
          name: talent.name,
          availability_date: talent.availability_date,
          project_type: talent.project_type,
          personnel_info: talent.personnel_info,
          resume_url: talent.resume_url,
          raw_data: talent.raw_data,
          source_hash: talent.source_hash,
        });

        if (error) {
          result.errors.push(`挿入失敗 [${talent.source_row_key}]: ${error.message}`);
        } else {
          result.inserted++;
        }
      }
    }

    // 5. Deactivate records that are no longer in the sheet
    const removedKeys = [...existingMap.entries()]
      .filter(([key, rec]) => !processedKeys.has(key) && rec.is_active)
      .map(([, rec]) => rec.id);

    if (removedKeys.length > 0) {
      const { error } = await supabase
        .from("external_talents")
        .update({ is_active: false, last_synced_at: new Date().toISOString() })
        .in("id", removedKeys);

      if (!error) {
        result.deactivated = removedKeys.length;
      }
    }

    // 6. Update source sync status
    await supabase
      .from("partner_sheet_sources")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_result: result,
      })
      .eq("id", source.id);
  } catch (err) {
    result.errors.push(
      `同期エラー: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return result;
}

/**
 * Sync all enabled partner sheets.
 * Called by cron endpoint.
 */
export async function syncAllPartnerSheets(): Promise<TalentSyncResult[]> {
  const supabase = createServiceClient();

  const { data: sources, error } = await supabase
    .from("partner_sheet_sources")
    .select("*")
    .eq("sync_enabled", true);

  if (error || !sources) {
    return [
      {
        sourceName: "system",
        total: 0,
        inserted: 0,
        updated: 0,
        deactivated: 0,
        unchanged: 0,
        errors: [`パートナーソース取得失敗: ${error?.message || "unknown"}`],
      },
    ];
  }

  const results: TalentSyncResult[] = [];

  // Process sequentially to avoid rate limits
  for (const source of sources) {
    const result = await syncTalentSheet(source as PartnerSource);
    results.push(result);
  }

  return results;
}
