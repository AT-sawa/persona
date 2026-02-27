-- マッチング結果テーブル
CREATE TABLE matching_results (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id     uuid REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  score       numeric(5,2) NOT NULL,
  factors     jsonb NOT NULL DEFAULT '{}',
  is_notified boolean DEFAULT false,
  matched_at  timestamptz DEFAULT now(),
  UNIQUE (case_id, user_id)
);

CREATE INDEX idx_matching_results_user_id ON matching_results(user_id);
CREATE INDEX idx_matching_results_case_id ON matching_results(case_id);
CREATE INDEX idx_matching_results_score ON matching_results(score DESC);

ALTER TABLE matching_results ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のマッチング結果のみ閲覧可
CREATE POLICY "matching_results_select_own"
  ON matching_results FOR SELECT
  USING (auth.uid() = user_id);

-- entries テーブル拡張
ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS resume_id uuid REFERENCES resumes(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
