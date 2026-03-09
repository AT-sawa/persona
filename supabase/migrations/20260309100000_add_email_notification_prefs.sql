-- メール通知設定と週次制限用カラム追加
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS notify_matching_email boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_matching_email_at timestamptz;

-- 既存レコードはデフォルトで通知ON
UPDATE user_preferences SET notify_matching_email = true WHERE notify_matching_email IS NULL;
