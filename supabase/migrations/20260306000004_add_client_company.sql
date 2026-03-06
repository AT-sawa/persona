-- Add client_company (元請け) field to cases table
-- This field is admin-only and should not be exposed to regular users
ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_company text;

COMMENT ON COLUMN cases.client_company IS '元請け企業名（管理者専用、ユーザーには非公開）';
