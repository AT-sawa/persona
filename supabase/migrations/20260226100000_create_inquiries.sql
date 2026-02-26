-- Inquiries table for LP lead capture and enterprise contact forms
CREATE TABLE IF NOT EXISTS inquiries (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type          text NOT NULL DEFAULT 'consultant_lead',
  full_name     text,
  email         text NOT NULL,
  phone         text,
  firm          text,
  experience    text,
  company_name  text,
  message       text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert (for LP forms)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'inquiries_anon_insert' AND tablename = 'inquiries'
  ) THEN
    CREATE POLICY "inquiries_anon_insert" ON inquiries
      FOR INSERT TO anon WITH CHECK (true);
  END IF;
END
$$;

-- Only service_role can read inquiries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'inquiries_service_read' AND tablename = 'inquiries'
  ) THEN
    CREATE POLICY "inquiries_service_read" ON inquiries
      FOR SELECT TO service_role USING (true);
  END IF;
END
$$;
