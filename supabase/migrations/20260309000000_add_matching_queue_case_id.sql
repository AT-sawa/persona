-- ============================================================
-- matching_queue に target_case_id を追加
-- 案件単位でのマッチング実行を可能にする
-- ============================================================

ALTER TABLE matching_queue
  ADD COLUMN IF NOT EXISTS target_case_id uuid REFERENCES cases(id) ON DELETE CASCADE;

-- trigger_type に case_create, daily_cron を追加
ALTER TABLE matching_queue DROP CONSTRAINT IF EXISTS matching_queue_trigger_type_check;
ALTER TABLE matching_queue ADD CONSTRAINT matching_queue_trigger_type_check
  CHECK (trigger_type IN ('sync', 'manual', 'user_register', 'user_update', 'case_create', 'daily_cron'));
