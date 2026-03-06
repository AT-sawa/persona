-- User-generated case study submissions
-- Consultants can submit project experiences for SEO content

CREATE TABLE IF NOT EXISTS case_study_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  -- Content
  title text NOT NULL,
  industry text,
  category text,
  duration text,
  role text,                     -- Consultant's role in the project
  team_size text,
  summary text NOT NULL,
  background text,               -- Project background
  challenge text,                -- Key challenges
  approach text,                 -- What they did (markdown)
  results text,                  -- Key results/outcomes (markdown)
  learnings text,                -- Lessons learned
  -- Metadata
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewing', 'approved', 'published', 'rejected')),
  admin_notes text,              -- Internal notes from admin review
  published_slug text UNIQUE,    -- Slug when published to blog
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_css_user ON case_study_submissions(user_id);
CREATE INDEX idx_css_status ON case_study_submissions(status);

-- RLS
ALTER TABLE case_study_submissions ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own submissions
CREATE POLICY "users_own_submissions" ON case_study_submissions
  FOR ALL USING (auth.uid() = user_id);

-- Admin can see and manage all
CREATE POLICY "admin_all_submissions" ON case_study_submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
