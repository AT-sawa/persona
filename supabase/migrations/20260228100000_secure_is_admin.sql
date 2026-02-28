-- ============================================
-- セキュリティ修正: is_admin フィールドの不正変更を防止
-- ============================================

-- profiles_self ポリシーは全操作に適用されるため、
-- ユーザーが自分の is_admin を true に変更できてしまう。
-- トリガーで is_admin の変更を制限する。

CREATE OR REPLACE FUNCTION prevent_self_admin_promotion()
RETURNS TRIGGER AS $$
BEGIN
  -- サービスロールからの変更は許可（管理者が管理画面から変更する場合）
  IF current_setting('role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 既存の管理者による他ユーザーの is_admin 変更は許可
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RETURN NEW;
  END IF;

  -- 一般ユーザーが is_admin を変更しようとした場合は拒否
  IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
    RAISE EXCEPTION 'is_admin フィールドの変更権限がありません';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを適用
DROP TRIGGER IF EXISTS trigger_prevent_self_admin_promotion ON profiles;
CREATE TRIGGER trigger_prevent_self_admin_promotion
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_admin_promotion();

-- ============================================
-- notifications テーブルの INSERT ポリシーを制限
-- ============================================

-- 現在の全許可ポリシーを削除して、より制限的なものに置き換え
DROP POLICY IF EXISTS "notifications_insert_service" ON notifications;

-- 認証済みユーザーは自分宛の通知のみ挿入可能
CREATE POLICY "notifications_insert_own" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
