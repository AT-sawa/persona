-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns
ALTER TABLE cases ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- HNSW indexes for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_cases_embedding ON cases
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_profiles_embedding ON profiles
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Add semantic fields to matching_results
ALTER TABLE matching_results ADD COLUMN IF NOT EXISTS semantic_score numeric(5,2);
ALTER TABLE matching_results ADD COLUMN IF NOT EXISTS llm_reasoning text;

-- RPC function for vector similarity search
CREATE OR REPLACE FUNCTION match_cases_by_embedding(
  query_embedding vector(1536),
  match_count int DEFAULT 30,
  match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  title text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    cases.id,
    cases.title,
    1 - (cases.embedding <=> query_embedding) AS similarity
  FROM cases
  WHERE cases.is_active = true
    AND cases.embedding IS NOT NULL
    AND 1 - (cases.embedding <=> query_embedding) > match_threshold
  ORDER BY cases.embedding <=> query_embedding
  LIMIT match_count;
$$;
