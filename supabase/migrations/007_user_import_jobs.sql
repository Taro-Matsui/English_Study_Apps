-- import_jobs をユーザー別に分離

ALTER TABLE import_jobs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow all" ON import_jobs;
DROP POLICY IF EXISTS "Allow all" ON import_jobs;

CREATE POLICY "Users manage own import_jobs"
  ON import_jobs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
