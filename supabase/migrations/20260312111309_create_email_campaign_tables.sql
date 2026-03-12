-- Create email_campaigns table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  utm_source TEXT DEFAULT 'outreach',
  utm_campaign TEXT DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create email_sends table
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);

-- Enable RLS
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_campaigns' AND policyname = 'admin_all_campaigns') THEN
    CREATE POLICY admin_all_campaigns ON email_campaigns FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_sends' AND policyname = 'admin_all_sends') THEN
    CREATE POLICY admin_all_sends ON email_sends FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
    );
  END IF;
END $$;
