-- Add job search status to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_looking boolean DEFAULT true;
