-- Email intake logs: メール取込のトラッキング
CREATE TABLE IF NOT EXISTS email_intake_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  from_address text,
  subject text,
  body_preview text,
  cases_extracted int NOT NULL DEFAULT 0,
  cases_imported int NOT NULL DEFAULT 0,
  duplicates_skipped int NOT NULL DEFAULT 0,
  errors text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'partial', 'failed', 'no_cases')),
  processing_time_ms int,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_intake_logs ENABLE ROW LEVEL SECURITY;

-- 管理者のみ閲覧可
CREATE POLICY "admin_select" ON email_intake_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE INDEX idx_email_intake_logs_received_at ON email_intake_logs(received_at DESC);

-- cases テーブルにFK追加（どのメールから取り込まれたか）
ALTER TABLE cases ADD COLUMN IF NOT EXISTS email_intake_id uuid REFERENCES email_intake_logs(id);
CREATE INDEX IF NOT EXISTS idx_cases_email_intake_id ON cases(email_intake_id);
