-- 回答時間（問題表示から回答送信までのミリ秒）を quiz_answers に追加
ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS response_time_ms INT;

-- 高速正答フレーズの検索用インデックス
CREATE INDEX IF NOT EXISTS idx_quiz_answers_response_time
  ON quiz_answers (session_id, is_correct, response_time_ms)
  WHERE response_time_ms IS NOT NULL;
