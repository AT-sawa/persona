/**
 * External talent sync from Notion databases — READ-ONLY.
 *
 * Uses the Notion API to fetch talent records from partner Notion databases.
 * Requires NOTION_API_KEY (Notion integration token) in environment variables.
 *
 * IMPORTANT:
 * - Never writes back to Notion
 * - Minimal API calls: one paginated query per database
 * - Maps Notion properties to external_talents fields
 */

import { createServiceClient } from "@/lib/supabase/service";
import { computeSourceHash } from "@/lib/dedup";

const NOTION_API_VERSION = "2022-06-28";
const NOTION_API_BASE = "https://api.notion.com/v1";

// ── Types ──

interface NotionPartnerSource {
  id: string;
  name: string;
  sheet_url: string; // Notion page URL (reusing column name for compat)
  source_type: "notion";
  field_mapping: {
    notion_collection_id?: string;
    notion_database_id?: string;
    property_map?: Record<string, string>;
  };
  sync_enabled: boolean;
}

interface NotionTalentRecord {
  source_name: string;
  source_url: string;
  source_row_key: string; // Notion page ID
  name: string | null;
  position: string | null;
  age_range: string | null;
  work_style: string | null;
  fee_min: number | null;
  fee_max: number | null;
  introduction: string | null;
  distribution: string | null;
  availability_date: string | null;
  project_type: string | null;
  personnel_info: string | null;
  resume_url: string | null;
  raw_data: Record<string, string>;
  source_hash: string;
}

export interface NotionTalentSyncResult {
  sourceName: string;
  total: number;
  inserted: number;
  updated: number;
  deactivated: number;
  unchanged: number;
  errors: string[];
}

// ── Notion API helpers ──

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
      }
      return "";
    case "rollup":
      if (prop.rollup?.type === "number")
        return prop.rollup.number != null ? String(prop.rollup.number) : "";
      return "";
    default:
      return "";
  }
}

async function notionFetch(
  path: string,
  options: { method?: string; body?: unknown } = {}
) {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NOTION_API_KEYが設定されていません。Notion Integrationトークンを環境変数に追加してください。"
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
        "Notion APIの認証に失敗しました。NOTION_API_KEYを確認してください。"
      );
    }
    if (res.status === 404) {
      throw new Error(
        "Notionデータベースが見つかりません。インテグレーションとの共有設定を確認してください。"
      );
    }
    throw new Error(
      `Notion APIエラー (${res.status}): ${errBody.slice(0, 200)}`
    );
  }

  return res.json();
}

function formatDatabaseId(id: string): string {
  const clean = id.replace(/-/g, "");
  return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(
    12,
    16
  )}-${clean.slice(16, 20)}-${clean.slice(20)}`;
}

// ── Fetch all rows from a Notion database ──

async function fetchNotionTalentDatabase(
  databaseId: string,
  propertyMap: Record<string, string>,
  sourceName: string,
  sourceUrl: string
): Promise<NotionTalentRecord[]> {
  const formattedId = formatDatabaseId(databaseId);

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

  // Map Notion pages to talent records
  return allPages.map((page) => {
    const raw: Record<string, string> = {};
    const record: Partial<NotionTalentRecord> = {
      source_name: sourceName,
      source_url: sourceUrl,
      source_row_key: page.id,
    };

    for (const [propName, prop] of Object.entries(page.properties || {})) {
      const value = extractPropertyValue(
        prop as { type: string; [key: string]: unknown }
      );
      if (!value) continue;

      raw[propName] = value;

      const mappedField = propertyMap[propName];
      if (mappedField) {
        switch (mappedField) {
          case "name":
            record.name = value;
            break;
          case "position":
            record.position = value;
            break;
          case "age_range":
            record.age_range = value;
            break;
          case "work_style":
            record.work_style = value;
            break;
          case "fee_min":
            record.fee_min = parseInt(value, 10) || null;
            break;
          case "fee_max":
            record.fee_max = parseInt(value, 10) || null;
            break;
          case "introduction":
            record.introduction = value;
            break;
          case "distribution":
            record.distribution = value;
            break;
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
        }
      }
    }

    // Build personnel_info from available fields if not explicitly mapped
    if (!record.personnel_info) {
      const parts: string[] = [];
      if (record.position) parts.push(`ポジション: ${record.position}`);
      if (record.age_range) parts.push(`年齢: ${record.age_range}`);
      if (record.work_style) parts.push(`勤務: ${record.work_style}`);
      if (record.distribution) parts.push(`商流: ${record.distribution}`);
      if (record.introduction) parts.push(record.introduction);
      if (parts.length > 0) {
        record.personnel_info = parts.join("\n");
      }
    }

    return {
      source_name: sourceName,
      source_url: sourceUrl,
      source_row_key: page.id,
      name: record.name || null,
      position: record.position || null,
      age_range: record.age_range || null,
      work_style: record.work_style || null,
      fee_min: record.fee_min || null,
      fee_max: record.fee_max || null,
      introduction: record.introduction || null,
      distribution: record.distribution || null,
      availability_date: record.availability_date || null,
      project_type: record.project_type || null,
      personnel_info: record.personnel_info || null,
      resume_url: record.resume_url || null,
      raw_data: raw,
      source_hash: computeSourceHash(raw),
    };
  });
}

// ── Main sync function ──

export async function syncTalentNotion(
  source: NotionPartnerSource
): Promise<NotionTalentSyncResult> {
  const result: NotionTalentSyncResult = {
    sourceName: source.name,
    total: 0,
    inserted: 0,
    updated: 0,
    deactivated: 0,
    unchanged: 0,
    errors: [],
  };

  try {
    const databaseId =
      source.field_mapping.notion_database_id ||
      source.field_mapping.notion_collection_id;

    if (!databaseId) {
      result.errors.push("NotionデータベースIDが設定されていません");
      return result;
    }

    const propertyMap = source.field_mapping.property_map || {};
    const sourceUrl = source.sheet_url;

    // 1. Fetch all records from Notion
    const talents = await fetchNotionTalentDatabase(
      databaseId,
      propertyMap,
      source.name,
      sourceUrl
    );

    result.total = talents.length;

    if (talents.length === 0) {
      return result;
    }

    // 2. Get existing records for this source
    const supabase = createServiceClient();
    const { data: existing } = await supabase
      .from("external_talents")
      .select("id, source_row_key, source_hash, is_active")
      .eq("source_name", source.name);

    const existingMap = new Map(
      (existing || []).map((e) => [e.source_row_key, e])
    );

    // 3. Upsert each talent
    const processedKeys = new Set<string>();

    for (const talent of talents) {
      processedKeys.add(talent.source_row_key);
      const existingRecord = existingMap.get(talent.source_row_key);

      if (existingRecord) {
        // Record exists — check if content changed
        if (existingRecord.source_hash === talent.source_hash) {
          if (!existingRecord.is_active) {
            await supabase
              .from("external_talents")
              .update({
                is_active: true,
                last_synced_at: new Date().toISOString(),
              })
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
              position: talent.position,
              age_range: talent.age_range,
              work_style: talent.work_style,
              fee_min: talent.fee_min,
              fee_max: talent.fee_max,
              introduction: talent.introduction,
              distribution: talent.distribution,
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
            result.errors.push(
              `更新失敗 [${talent.source_row_key.slice(0, 8)}]: ${error.message}`
            );
          } else {
            result.updated++;
          }
        }
      } else {
        // New record → insert
        const { error } = await supabase.from("external_talents").insert({
          source_name: talent.source_name,
          source_sheet_url: talent.source_url,
          source_row_key: talent.source_row_key,
          name: talent.name,
          position: talent.position,
          age_range: talent.age_range,
          work_style: talent.work_style,
          fee_min: talent.fee_min,
          fee_max: talent.fee_max,
          introduction: talent.introduction,
          distribution: talent.distribution,
          availability_date: talent.availability_date,
          project_type: talent.project_type,
          personnel_info: talent.personnel_info,
          resume_url: talent.resume_url,
          raw_data: talent.raw_data,
          source_hash: talent.source_hash,
        });

        if (error) {
          result.errors.push(
            `挿入失敗 [${talent.source_row_key.slice(0, 8)}]: ${error.message}`
          );
        } else {
          result.inserted++;
        }
      }
    }

    // 4. Deactivate records no longer in Notion
    const removedKeys = [...existingMap.entries()]
      .filter(([key, rec]) => !processedKeys.has(key) && rec.is_active)
      .map(([, rec]) => rec.id);

    if (removedKeys.length > 0) {
      const { error } = await supabase
        .from("external_talents")
        .update({
          is_active: false,
          last_synced_at: new Date().toISOString(),
        })
        .in("id", removedKeys);

      if (!error) {
        result.deactivated = removedKeys.length;
      }
    }

    // 5. Update source sync status
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
