-- ============================================================
-- Engineer English Learning App - Supabase Schema
-- ============================================================

-- テーブル1: phrases（フレーズマスター）
CREATE TABLE phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase TEXT NOT NULL,
  pronunciation TEXT,          -- 発音記号（IPA）
  meaning_ja TEXT,             -- 日本語意味
  source_type TEXT,            -- 'DSH_Event'|'YouTube'|'Podcast'
  source_title TEXT,
  source_date DATE,
  original_context TEXT,       -- 元の会話での使用例（英語原文）
  added_date DATE DEFAULT NOW(),
  difficulty INT DEFAULT 3     -- 1-5（SRS初期値）
);

-- テーブル2: user_progress（SRS学習進捗）
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase_id UUID NOT NULL REFERENCES phrases(id) ON DELETE CASCADE,
  ease_factor FLOAT DEFAULT 2.5,        -- SM-2アルゴリズムのeFactorF
  interval_days INT DEFAULT 1,          -- 次回復習までの日数
  repetitions INT DEFAULT 0,            -- 正解連続回数
  next_review_date DATE DEFAULT NOW(),  -- 次回復習日
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- テーブル3: quiz_sessions（クイズセッション）
CREATE TABLE quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_questions INT DEFAULT 0,
  correct_count INT DEFAULT 0,
  session_type TEXT DEFAULT 'srs'       -- 'srs'|'random'|'review'
);

-- テーブル4: quiz_answers（クイズ回答履歴）
CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  phrase_id UUID NOT NULL REFERENCES phrases(id) ON DELETE CASCADE,
  user_answer TEXT,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INT,                 -- 回答にかかった時間（ミリ秒）
  ai_feedback TEXT,                     -- Claude APIによるフィードバック
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- インデックス
-- ============================================================
CREATE INDEX idx_phrases_source_type ON phrases(source_type);
CREATE INDEX idx_phrases_difficulty ON phrases(difficulty);
CREATE INDEX idx_user_progress_phrase_id ON user_progress(phrase_id);
CREATE INDEX idx_user_progress_next_review ON user_progress(next_review_date);
CREATE INDEX idx_quiz_answers_session_id ON quiz_answers(session_id);
CREATE INDEX idx_quiz_answers_phrase_id ON quiz_answers(phrase_id);

-- ============================================================
-- RLS（Row Level Security）
-- ============================================================
ALTER TABLE phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- 認証不要のシングルユーザーアプリ想定: service_roleで全操作許可
CREATE POLICY "Allow all for service role" ON phrases
  FOR ALL USING (true);

CREATE POLICY "Allow all for service role" ON user_progress
  FOR ALL USING (true);

CREATE POLICY "Allow all for service role" ON quiz_sessions
  FOR ALL USING (true);

CREATE POLICY "Allow all for service role" ON quiz_answers
  FOR ALL USING (true);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
