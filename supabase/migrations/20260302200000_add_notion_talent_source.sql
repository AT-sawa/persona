-- Add source_type to partner_sheet_sources to support Notion as well as Google Sheets
ALTER TABLE partner_sheet_sources ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'google_sheet'
  CHECK (source_type IN ('google_sheet', 'notion'));

-- Rename sheet_url constraint to source_url (conceptually) — drop and recreate unique index
-- (sheet_url column stays the same name for backward compat but now also holds Notion URLs)

-- Expand external_talents to support non-sheet source URLs
-- source_sheet_url was the original name; it also stores Notion URLs now
ALTER TABLE external_talents ADD COLUMN IF NOT EXISTS position text;       -- ポジション
ALTER TABLE external_talents ADD COLUMN IF NOT EXISTS age_range text;      -- 年齢
ALTER TABLE external_talents ADD COLUMN IF NOT EXISTS work_style text;     -- 出社/リモート
ALTER TABLE external_talents ADD COLUMN IF NOT EXISTS fee_min integer;     -- MIN単価
ALTER TABLE external_talents ADD COLUMN IF NOT EXISTS fee_max integer;     -- MAX単価
ALTER TABLE external_talents ADD COLUMN IF NOT EXISTS introduction text;   -- 紹介文
ALTER TABLE external_talents ADD COLUMN IF NOT EXISTS distribution text;   -- 商流

-- Insert meher Notion source
INSERT INTO partner_sheet_sources (name, sheet_url, source_type, layout, field_mapping)
VALUES (
  'meher',
  'https://meher.notion.site/meher-1daf5f411028804b9937f59feceb9d88',
  'notion',
  'standard',
  '{
    "notion_collection_id": "1daf5f41-1028-811f-9193-000b60894ac2",
    "notion_database_id": "1daf5f411028811f9193000b60894ac2",
    "property_map": {
      "イニシャル": "name",
      "ポジション": "position",
      "年齢": "age_range",
      "出社/リモート": "work_style",
      "MIN_請求単価（税抜）": "fee_min",
      "MAX_請求単価（税抜）": "fee_max",
      "紹介文": "introduction",
      "商流": "distribution",
      "レジュメURL": "resume_url",
      "稼働率": "occupancy",
      "人材コード": "talent_code",
      "提案する": "proposal_url"
    }
  }'::jsonb
) ON CONFLICT (sheet_url) DO NOTHING;
