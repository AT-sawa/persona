-- 案件レビュールール（ユーザーの指摘を蓄積）
CREATE TABLE IF NOT EXISTS case_review_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern TEXT NOT NULL,
  target TEXT DEFAULT 'both' CHECK (target IN ('title', 'body', 'both')),
  action TEXT DEFAULT 'block' CHECK (action IN ('block', 'warn')),
  reason TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE case_review_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all" ON case_review_rules FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 案件にレビュー結果カラムを追加
ALTER TABLE cases ADD COLUMN IF NOT EXISTS review_score INTEGER;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS review_flags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- 初期ルール挿入（キャスター関連）
INSERT INTO case_review_rules (pattern, target, action, reason) VALUES
  ('キャスター|MyAssistant|マイアシスタント', 'both', 'block', 'キャスター/マイアシスタントの内部連絡（案件ではない）'),
  ('slack\.com\/archives|slack\.com\/messages', 'both', 'block', 'Slackリンク（内部メッセージの混入）'),
  ('ルーティン.*(?:報告|連絡|確認)|定期.*(?:報告|連絡)', 'both', 'block', '定期報告メッセージ（案件ではない）'),
  ('申し送り|引き継ぎ事項', 'title', 'block', '社内申し送り（案件ではない）')
ON CONFLICT DO NOTHING;
