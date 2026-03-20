-- user_progress にユーザー列追加 + is_mastered フラグ + RLS 有効化

ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_mastered BOOLEAN DEFAULT false;

-- user_id + phrase_id の組み合わせをユニーク制約
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_progress_user_phrase
  ON user_progress(user_id, phrase_id);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow all" ON user_progress;
DROP POLICY IF EXISTS "Allow all" ON user_progress;

CREATE POLICY "Users manage own progress"
  ON user_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
