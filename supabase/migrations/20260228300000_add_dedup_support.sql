-- ============================================================
-- Cases: ソース追跡 + 正規化タイトル
-- ============================================================

-- 同期元情報
ALTER TABLE cases ADD COLUMN IF NOT EXISTS source text;
  -- 'google_sheet' | 'notion' | 'email' | 'csv' | 'manual'
ALTER TABLE cases ADD COLUMN IF NOT EXISTS source_url text;
  -- シートURLやNotionデータベースURL
ALTER TABLE cases ADD COLUMN IF NOT EXISTS synced_at timestamptz;
  -- 最後に外部ソースと同期した日時
ALTER TABLE cases ADD COLUMN IF NOT EXISTS source_hash text;
  -- 主要フィールドのハッシュ（変更検出用）

-- 正規化タイトル（重複検出の高速パス用）
ALTER TABLE cases ADD COLUMN IF NOT EXISTS title_normalized text;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_cases_title_normalized ON cases(title_normalized);
CREATE INDEX IF NOT EXISTS idx_cases_source ON cases(source, source_url);

-- 既存データの初期化
UPDATE cases SET source = 'manual' WHERE source IS NULL;

-- ============================================================
-- Profiles: 正規化名前（人材重複検出用）
-- ============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name_normalized text;
CREATE INDEX IF NOT EXISTS idx_profiles_name_norm ON profiles(name_normalized);
