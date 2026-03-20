-- パフォーマンス改善: user_id カラムへのインデックス追加
-- migration 005-008 で user_id を追加したが、インデックスが未作成だった

CREATE INDEX IF NOT EXISTS idx_phrases_user_id
  ON phrases(user_id);

-- deleted_at IS NULL フィルタを含む複合インデックス（一覧・クイズで使用）
CREATE INDEX IF NOT EXISTS idx_phrases_user_deleted
  ON phrases(user_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id
  ON quiz_sessions(user_id);

-- 履歴一覧で completed_at DESC ソートを高速化
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_completed
  ON quiz_sessions(user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_jobs_user_id
  ON import_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_user_progress_user_id
  ON user_progress(user_id);

-- user_progress: phrases への明示的 FK（フレーズ削除時に進捗レコードも CASCADE 削除）
-- 注: PostgreSQL は ADD CONSTRAINT IF NOT EXISTS を未サポートのため DO ブロックで代替
DO $$ BEGIN
  ALTER TABLE user_progress
    ADD CONSTRAINT fk_user_progress_phrase
    FOREIGN KEY (phrase_id) REFERENCES phrases(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- user_progress: UNIQUE INDEX だけでなく CONSTRAINT も明示（PostgREST upsert の信頼性向上）
DO $$ BEGIN
  ALTER TABLE user_progress
    ADD CONSTRAINT unique_user_phrase UNIQUE (user_id, phrase_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
