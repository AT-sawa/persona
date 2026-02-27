-- ユーザー希望条件テーブル
CREATE TABLE user_preferences (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  desired_rate_min    integer,
  desired_rate_max    integer,
  desired_industries  text[],
  desired_categories  text[],
  desired_roles       text[],
  preferred_locations text[],
  remote_preference   text
    CHECK (remote_preference IN ('remote_only', 'hybrid', 'onsite', 'any')),
  min_occupancy       numeric(3,2),
  max_occupancy       numeric(3,2),
  available_from      date,
  notes               text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_preferences_select_own"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_insert_own"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_update_own"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_delete_own"
  ON user_preferences FOR DELETE
  USING (auth.uid() = user_id);
