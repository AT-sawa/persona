-- メール添付ファイルの保存メタデータ
CREATE TABLE IF NOT EXISTS email_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email_intake_id uuid NOT NULL REFERENCES email_intake_logs(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select" ON email_attachments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX idx_email_attachments_intake ON email_attachments(email_intake_id);

-- email_intake_logs に添付件数カラム追加
ALTER TABLE email_intake_logs ADD COLUMN IF NOT EXISTS attachments_count int NOT NULL DEFAULT 0;

-- external_talents にレジュメファイル保存用カラム追加
ALTER TABLE external_talents ADD COLUMN IF NOT EXISTS resume_file_path text;
ALTER TABLE external_talents ADD COLUMN IF NOT EXISTS resume_file_size integer;
ALTER TABLE external_talents ADD COLUMN IF NOT EXISTS resume_mime_type text;
ALTER TABLE external_talents ADD COLUMN IF NOT EXISTS resume_uploaded_at timestamptz;
