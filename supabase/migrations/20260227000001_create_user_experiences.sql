-- 職務経歴テーブル
CREATE TABLE user_experiences (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  company_name    text NOT NULL,
  role            text NOT NULL,
  industry        text,
  start_date      date NOT NULL,
  end_date        date,
  is_current      boolean DEFAULT false,
  description     text,
  skills_used     text[],
  sort_order      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_user_experiences_user_id ON user_experiences(user_id);

ALTER TABLE user_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_experiences_select_own"
  ON user_experiences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_experiences_insert_own"
  ON user_experiences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_experiences_update_own"
  ON user_experiences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_experiences_delete_own"
  ON user_experiences FOR DELETE
  USING (auth.uid() = user_id);
