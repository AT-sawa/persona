-- 管理者フラグ追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- 管理者チェック用の関数を作成
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 管理者ポリシー追加: profiles
-- ============================================
CREATE POLICY "profiles_admin_select" ON profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- 管理者ポリシー追加: entries
-- ============================================
CREATE POLICY "entries_admin_select" ON entries
  FOR SELECT USING (is_admin());

CREATE POLICY "entries_admin_update" ON entries
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- 管理者ポリシー追加: cases (INSERT/UPDATE/DELETE)
-- ============================================
CREATE POLICY "cases_admin_all" ON cases
  USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- 管理者ポリシー追加: user_experiences
-- ============================================
CREATE POLICY "user_experiences_admin_select" ON user_experiences
  FOR SELECT USING (is_admin());

-- ============================================
-- 管理者ポリシー追加: user_preferences
-- ============================================
CREATE POLICY "user_preferences_admin_select" ON user_preferences
  FOR SELECT USING (is_admin());

-- ============================================
-- 管理者ポリシー追加: resumes
-- ============================================
CREATE POLICY "resumes_admin_select" ON resumes
  FOR SELECT USING (is_admin());

-- ============================================
-- 管理者ポリシー追加: matching_results
-- ============================================
CREATE POLICY "matching_results_admin_select" ON matching_results
  FOR SELECT USING (is_admin());

-- ============================================
-- 管理者ポリシー追加: inquiries (SELECTを管理者にも許可)
-- ============================================
CREATE POLICY "inquiries_admin_select" ON inquiries
  FOR SELECT USING (is_admin());

CREATE POLICY "inquiries_admin_update" ON inquiries
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- ============================================
-- 管理者ポリシー追加: storage.objects (resumes バケット)
-- ============================================
CREATE POLICY "resumes_storage_admin_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'resumes' AND is_admin());
