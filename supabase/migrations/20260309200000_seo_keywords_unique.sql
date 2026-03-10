-- Add unique constraint on seo_keywords.keyword (case-insensitive)
-- to prevent duplicate keyword entries during concurrent syncs.

-- First, create a normalized keyword column for the unique index
-- Using lower(trim(keyword)) as the unique key

CREATE UNIQUE INDEX IF NOT EXISTS seo_keywords_keyword_lower_unique
  ON seo_keywords (lower(trim(keyword)));
