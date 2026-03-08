-- ============================================
-- クライアント向け人材提案ポータル
-- ============================================

-- 1. profiles テーブル拡張
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_client boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_name text;

-- is_client() ヘルパー関数（is_admin() と同パターン）
CREATE OR REPLACE FUNCTION is_client()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_client = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- is_client 自己昇格防止トリガー
CREATE OR REPLACE FUNCTION prevent_self_client_promotion()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RETURN NEW;
  END IF;
  IF OLD.is_client IS DISTINCT FROM NEW.is_client THEN
    RAISE EXCEPTION 'is_client フィールドの変更権限がありません';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_prevent_self_client_promotion ON profiles;
CREATE TRIGGER trigger_prevent_self_client_promotion
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_client_promotion();

-- ============================================
-- 2. proposals テーブル（提案書）
-- ============================================
CREATE TABLE proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES cases(id),
  client_id uuid NOT NULL REFERENCES profiles(id),
  title text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'viewed', 'responded', 'closed')),
  sent_at timestamptz,
  viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposals_client ON proposals(client_id);
CREATE INDEX idx_proposals_case ON proposals(case_id);
CREATE INDEX idx_proposals_status ON proposals(status);

-- ============================================
-- 3. proposal_talents テーブル（提案人材）
-- ============================================
CREATE TABLE proposal_talents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id),
  external_talent_id uuid REFERENCES external_talents(id),
  display_label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  client_fee integer,
  internal_cost integer,
  internal_note text,
  summary_position text,
  summary_experience text,
  summary_skills text[],
  summary_background text,
  summary_work_style text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_talent_source CHECK (
    (profile_id IS NOT NULL AND external_talent_id IS NULL) OR
    (profile_id IS NULL AND external_talent_id IS NOT NULL)
  )
);

CREATE INDEX idx_proposal_talents_proposal ON proposal_talents(proposal_id);

-- ============================================
-- 4. proposal_reactions テーブル（リアクション）
-- ============================================
CREATE TABLE proposal_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_talent_id uuid NOT NULL REFERENCES proposal_talents(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id),
  reaction text NOT NULL CHECK (reaction IN ('interested', 'pass')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(proposal_talent_id, client_id)
);

CREATE INDEX idx_proposal_reactions_talent ON proposal_reactions(proposal_talent_id);

-- ============================================
-- 5. proposal_messages テーブル（メッセージ）
-- ============================================
CREATE TABLE proposal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  body text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposal_messages_proposal ON proposal_messages(proposal_id);

-- ============================================
-- 6. RLS ポリシー
-- ============================================

-- proposals
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_admin_all" ON proposals
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "proposals_client_select" ON proposals
  FOR SELECT USING (
    is_client() AND client_id = auth.uid() AND status != 'draft'
  );

CREATE POLICY "proposals_client_update" ON proposals
  FOR UPDATE USING (
    is_client() AND client_id = auth.uid() AND status != 'draft'
  ) WITH CHECK (
    is_client() AND client_id = auth.uid()
  );

-- proposal_talents
ALTER TABLE proposal_talents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_talents_admin_all" ON proposal_talents
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "proposal_talents_client_select" ON proposal_talents
  FOR SELECT USING (
    is_client() AND EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_talents.proposal_id
        AND proposals.client_id = auth.uid()
        AND proposals.status != 'draft'
    )
  );

-- proposal_reactions
ALTER TABLE proposal_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_reactions_admin_select" ON proposal_reactions
  FOR SELECT USING (is_admin());

CREATE POLICY "proposal_reactions_client_all" ON proposal_reactions
  FOR ALL USING (
    is_client() AND client_id = auth.uid()
  ) WITH CHECK (
    is_client() AND client_id = auth.uid()
  );

-- proposal_messages
ALTER TABLE proposal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposal_messages_admin_all" ON proposal_messages
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "proposal_messages_client_select" ON proposal_messages
  FOR SELECT USING (
    is_client() AND EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = proposal_messages.proposal_id
        AND proposals.client_id = auth.uid()
        AND proposals.status != 'draft'
    )
  );

CREATE POLICY "proposal_messages_client_insert" ON proposal_messages
  FOR INSERT WITH CHECK (
    is_client() AND sender_id = auth.uid() AND is_admin = false
  );
