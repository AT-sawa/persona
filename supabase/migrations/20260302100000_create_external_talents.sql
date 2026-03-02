-- External talents table: partner company talent data (read-only sync from Google Sheets)
CREATE TABLE IF NOT EXISTS external_talents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Source tracking
  source_name text NOT NULL,                -- Partner company name (e.g. 'みらいソリューション')
  source_sheet_url text NOT NULL,           -- Google Sheet URL
  source_row_key text NOT NULL,             -- Unique key within the sheet (e.g. column index or No)
  -- Normalized fields
  name text,
  availability_date text,                   -- 稼働開始日
  project_type text,                        -- 案件イメージ
  personnel_info text,                      -- 人員情報 (experience, skills, etc.)
  resume_url text,                          -- レジュメ URL
  -- Flexible storage for any additional fields
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Metadata
  source_hash text,                         -- Hash of content for change detection
  first_synced_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,  -- False if removed from source sheet
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one record per source + key combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_talents_source_key
  ON external_talents(source_sheet_url, source_row_key);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_external_talents_source_name
  ON external_talents(source_name);
CREATE INDEX IF NOT EXISTS idx_external_talents_active
  ON external_talents(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE external_talents ENABLE ROW LEVEL SECURITY;

-- Only admin and service_role can access
CREATE POLICY "Admin read access" ON external_talents
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Service role full access" ON external_talents
  FOR ALL USING (auth.role() = 'service_role');

-- Partner sheet sources config table
CREATE TABLE IF NOT EXISTS partner_sheet_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                       -- Partner company name
  sheet_url text NOT NULL UNIQUE,           -- Google Sheet URL
  sheet_name text,                          -- Specific sheet/tab name (optional)
  layout text NOT NULL DEFAULT 'transposed' CHECK (layout IN ('standard', 'transposed')),
  field_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,  -- Custom field mapping
  sync_enabled boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_sync_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partner_sheet_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access" ON partner_sheet_sources
  FOR ALL USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Insert the initial partner source
INSERT INTO partner_sheet_sources (name, sheet_url, layout, field_mapping)
VALUES (
  'みらいソリューション',
  'https://docs.google.com/spreadsheets/d/1G1iT3RXTeX4JflWGf_U4r6e3Rv-PTZMZWlyFyozFh5w/edit',
  'transposed',
  '{
    "row_labels": {
      "稼働開始日": "availability_date",
      "案件イメージ": "project_type",
      "人員情報": "personnel_info",
      "レジュメ": "resume_url"
    },
    "header_row": 2,
    "data_start_column": 4
  }'::jsonb
) ON CONFLICT (sheet_url) DO NOTHING;
