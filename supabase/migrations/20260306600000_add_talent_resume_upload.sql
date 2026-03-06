-- Add columns for PDF-uploaded talent profiles
ALTER TABLE external_talents ADD COLUMN IF NOT EXISTS resume_file_path text;  -- Storage path in talent-resumes bucket
ALTER TABLE external_talents ADD COLUMN IF NOT EXISTS resume_text text;        -- Full extracted text from PDF

-- Create talent-resumes storage bucket (admin-only, PDF only, 10MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'talent-resumes', 'talent-resumes', false, 10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: service_role has full access (used by API routes)
CREATE POLICY "talent_resumes_service_role"
  ON storage.objects FOR ALL
  USING (bucket_id = 'talent-resumes' AND auth.role() = 'service_role');

-- Storage RLS: admin can read (for signed URL generation)
CREATE POLICY "talent_resumes_admin_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'talent-resumes'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );
