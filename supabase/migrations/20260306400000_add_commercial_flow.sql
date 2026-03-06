-- 案件に商流カラムを追加（管理者専用・ユーザー非公開）
ALTER TABLE cases ADD COLUMN IF NOT EXISTS commercial_flow text;
