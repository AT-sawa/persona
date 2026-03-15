-- SEO施策トラッキング
CREATE TABLE IF NOT EXISTS seo_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL DEFAULT 'other',
  keyword TEXT NOT NULL,
  description TEXT NOT NULL,
  before_position INTEGER,
  before_clicks INTEGER,
  before_impressions INTEGER,
  after_position INTEGER,
  after_clicks INTEGER,
  after_impressions INTEGER,
  measured_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE seo_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all" ON seo_actions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
