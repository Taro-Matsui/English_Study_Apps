-- quiz_sessions / quiz_answers をユーザー別に分離

ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for quiz_sessions" ON quiz_sessions;
DROP POLICY IF EXISTS "Allow all" ON quiz_sessions;

CREATE POLICY "Users manage own sessions"
  ON quiz_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- quiz_answers は session_id 経由で user_id を継承
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for quiz_answers" ON quiz_answers;
DROP POLICY IF EXISTS "Allow all" ON quiz_answers;

CREATE POLICY "Users manage own answers"
  ON quiz_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM quiz_sessions
      WHERE quiz_sessions.id = quiz_answers.session_id
        AND quiz_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_sessions
      WHERE quiz_sessions.id = quiz_answers.session_id
        AND quiz_sessions.user_id = auth.uid()
    )
  );
