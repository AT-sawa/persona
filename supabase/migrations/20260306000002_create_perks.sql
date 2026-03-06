-- Benefits / Perks platform
-- Manages exclusive perks for registered consultants

CREATE TABLE IF NOT EXISTS perk_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  name_en text,
  slug text UNIQUE NOT NULL,
  icon text,                     -- Material Symbols icon name
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS perks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid REFERENCES perk_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  provider text NOT NULL,        -- Provider company name
  description text,
  benefit_summary text NOT NULL, -- Short benefit description (e.g. "初月無料", "20%OFF")
  details text,                  -- Full details (markdown)
  how_to_use text,               -- How to redeem
  external_url text,             -- Link to provider
  image_url text,
  -- Tier access
  tier text DEFAULT 'standard' CHECK (tier IN ('standard', 'gold', 'platinum')),
  -- Status
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  -- Period
  valid_from date,
  valid_until date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_perks_category ON perks(category_id);
CREATE INDEX idx_perks_tier ON perks(tier);
CREATE INDEX idx_perks_active ON perks(is_active, sort_order);

-- RLS
ALTER TABLE perk_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE perks ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active perks
CREATE POLICY "auth_read_perk_categories" ON perk_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "auth_read_perks" ON perks
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Admin can manage all
CREATE POLICY "admin_perk_categories" ON perk_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "admin_perks" ON perks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Seed perk categories
INSERT INTO perk_categories (name, name_en, slug, icon, sort_order) VALUES
  ('ビジネスツール', 'BUSINESS TOOLS', 'business-tools', 'build', 1),
  ('AI・テクノロジー', 'AI & TECH', 'ai-tech', 'smart_toy', 2),
  ('ヘルス・フィットネス', 'HEALTH & FITNESS', 'health-fitness', 'fitness_center', 3),
  ('ライフスタイル', 'LIFESTYLE', 'lifestyle', 'diamond', 4),
  ('学習・スキルアップ', 'LEARNING', 'learning', 'school', 5),
  ('ファイナンス・保険', 'FINANCE', 'finance-insurance', 'account_balance', 6),
  ('トラベル・ホスピタリティ', 'TRAVEL', 'travel', 'flight', 7),
  ('家事・生活サポート', 'HOME SERVICES', 'home-services', 'home', 8);
