-- 非同期インポートジョブ管理テーブル
-- Supabase SQL Editor で手動実行が必要

CREATE TABLE IF NOT EXISTS import_jobs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT        NOT NULL CHECK (type IN ('file', 'url')),
  source_name   TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'processing', 'done', 'error')),
  phrase_count  INT,
  phrases       JSONB,
  error_text    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON import_jobs FOR ALL USING (true) WITH CHECK (true);

-- 古いジョブを自動削除するインデックス（任意）
CREATE INDEX IF NOT EXISTS import_jobs_created_at_idx ON import_jobs (created_at DESC);
