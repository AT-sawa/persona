-- ============================================================
-- Matching Queue: デバウンス付きマッチング実行キュー
-- ============================================================

CREATE TABLE IF NOT EXISTS matching_queue (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_type text NOT NULL CHECK (trigger_type IN ('sync', 'manual', 'user_register', 'user_update')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  target_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  -- null = all users (batch), specific user_id = single user
  requested_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  result jsonb,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_matching_queue_status ON matching_queue(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_matching_queue_pending ON matching_queue(status) WHERE status = 'pending';

-- RLS: service role only (no client access)
ALTER TABLE matching_queue ENABLE ROW LEVEL SECURITY;

-- Clean up old completed records (keep last 100)
CREATE OR REPLACE FUNCTION cleanup_matching_queue() RETURNS trigger AS $$
BEGIN
  DELETE FROM matching_queue
  WHERE id NOT IN (
    SELECT id FROM matching_queue
    ORDER BY requested_at DESC
    LIMIT 100
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Run cleanup after insert (but don't block)
DROP TRIGGER IF EXISTS trg_cleanup_matching_queue ON matching_queue;
CREATE TRIGGER trg_cleanup_matching_queue
  AFTER INSERT ON matching_queue
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_matching_queue();
