-- SEO keyword ranking tracking
-- Stores daily snapshots of keyword positions from Google Search Console or manual input

CREATE TABLE IF NOT EXISTS seo_keywords (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword text NOT NULL,
  target_url text,               -- Target landing page URL
  is_primary boolean DEFAULT false, -- Primary keyword flag
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seo_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id uuid REFERENCES seo_keywords(id) ON DELETE CASCADE,
  position numeric(5,1),         -- Average position (e.g. 9.2)
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  ctr numeric(5,2) DEFAULT 0,    -- Click-through rate percentage
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  source text DEFAULT 'manual',  -- 'manual' | 'search_console'
  created_at timestamptz DEFAULT now(),
  UNIQUE(keyword_id, snapshot_date)
);

CREATE INDEX idx_seo_snapshots_date ON seo_snapshots(snapshot_date DESC);
CREATE INDEX idx_seo_snapshots_keyword ON seo_snapshots(keyword_id, snapshot_date DESC);

-- RLS
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_snapshots ENABLE ROW LEVEL SECURITY;

-- Admin only
CREATE POLICY "admin_seo_keywords" ON seo_keywords
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "admin_seo_snapshots" ON seo_snapshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Seed primary keywords
INSERT INTO seo_keywords (keyword, target_url, is_primary) VALUES
  ('フリーコンサル', '/', true),
  ('フリーコンサル 案件', '/cases', true),
  ('フリーコンサル 案件紹介', '/cases', true),
  ('フリーランス コンサルタント', '/', false),
  ('フリーコンサル 高単価', '/cases', false),
  ('DX コンサル フリーランス', '/cases/category/dx', false),
  ('SAP コンサル フリーランス', '/cases/category/sap', false),
  ('PMO フリーランス 案件', '/cases/category/pmo', false),
  ('戦略コンサル フリーランス', '/cases/category/strategy', false),
  ('フリーコンサル プラットフォーム', '/', false),
  ('コンサルタント 独立', '/blog', false),
  ('フリーランス コンサル 年収', '/blog', false);
