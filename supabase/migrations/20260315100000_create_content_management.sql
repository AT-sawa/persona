-- ============================================================
-- content_master: マスタープロンプト（ブランドボイス・事実データ・ルール等）
-- ============================================================
CREATE TABLE content_master (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN (
    'brand_voice',    -- ブランドの声・トーン
    'facts',          -- 事実データ（登録者数、報酬等）
    'instructions',   -- 記事作成ルール
    'ng_words',       -- NG表現・競合名
    'keywords',       -- 重要キーワード
    'qa'              -- 質問キューから反映された回答
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON content_master FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================================
-- content_questions: AI→ユーザーへの質問キュー
-- ============================================================
CREATE TABLE content_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  context TEXT,                -- 質問が生じた背景
  source TEXT DEFAULT 'auto' CHECK (source IN ('auto', 'seo_analysis', 'manual')),
  answer TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'applied', 'dismissed')),
  related_keyword TEXT,        -- 関連キーワード
  answered_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON content_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================================
-- content_updates: 自動最適化の実行ログ
-- ============================================================
CREATE TABLE content_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  update_type TEXT NOT NULL CHECK (update_type IN (
    'meta_title', 'meta_description', 'article_rewrite', 'new_draft', 'keyword_update'
  )),
  target_slug TEXT,           -- 対象記事のslug
  keyword TEXT,               -- 関連キーワード
  before_content TEXT,        -- 更新前
  after_content TEXT,         -- 更新後
  reason TEXT NOT NULL,       -- 更新理由
  status TEXT DEFAULT 'applied' CHECK (status IN ('draft', 'applied', 'reverted')),
  auto_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE content_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON content_updates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- ============================================================
-- 初期データ投入
-- ============================================================

-- ブランドボイス
INSERT INTO content_master (category, title, content, sort_order) VALUES
('brand_voice', 'トーン&マナー', '実務経験に基づく実践的なトーン。上から目線は避け、同じフリーコンサルの先輩として語る。読者が「自分ごと」として読める距離感を意識。', 1),
('brand_voice', '一人称・文体', '「ですます調」を基本とし、適度にフランクな表現を交える。「〜しましょう」「〜してみてください」など呼びかけ型を活用。', 2);

-- 事実データ
INSERT INTO content_master (category, title, content, sort_order) VALUES
('facts', 'サービス基本数値', '登録者1,200名以上 / 月額報酬125万円〜 / 提携エージェント30社以上 / 案件数100件以上', 1),
('facts', 'ユーザー属性', '大手ファーム出身者中心（MBB・Big4・アクセンチュア等）。戦略・IT・業務・PMOなど幅広い領域。', 2),
('facts', '対応案件領域', 'PMO / 戦略コンサル / IT・システム導入 / DX推進 / SAP / 生成AI / 新規事業 / M&A PMI / 業務改革', 3);

-- 記事作成ルール
INSERT INTO content_master (category, title, content, sort_order) VALUES
('instructions', '基本ルール', 'E-E-A-T重視。3000-5000文字。Markdown形式。冒頭に読者の課題を太字で端的に提示。', 1),
('instructions', '内部リンク', '内部リンクを2-4本配置。関連記事URLは /blog/{slug} 形式。自然な文脈でリンクを設置。', 2),
('instructions', 'CTA', 'PERSONAの直接的な宣伝は記事の最後のCTAセクションのみ。/cases へのリンク1つ程度。本文中は中立的な立場で執筆。', 3),
('instructions', 'SEOメタ', 'タイトル: 50-65文字でキーワードを含む。メタディスクリプション: 120-160文字で検索ユーザーがクリックしたくなる内容。', 4);

-- NG表現
INSERT INTO content_master (category, title, content, sort_order) VALUES
('ng_words', '競合名', 'BTCエージェント / ハイパフォコンサル / コンサルポータル / フリーコンサルタント.jp / POD / Skill Connect / コンサルデータバンク', 1),
('ng_words', '禁止表現', '競合を直接名指しして比較する表現は禁止。誹謗中傷・比較広告は厳禁。「業界No.1」「唯一の」等の根拠のない最上級表現も避ける。', 2),
('ng_words', '注意キーワード', '「絶対」「確実」「保証」「必ず儲かる」など景品表示法に抵触しうる断定的表現は使用しない。', 3);

-- 重要キーワード
INSERT INTO content_master (category, title, content, sort_order) VALUES
('keywords', '主要ターゲットKW', 'フリーコンサル / フリーランスコンサルタント / コンサル 独立 / フリーコンサル 案件 / コンサル フリーランス', 1),
('keywords', '領域別KW', 'PMO フリーコンサル / SAP コンサル フリーランス / DX推進 フリーコンサル / 生成AI コンサル / 戦略コンサル フリーランス', 2);
