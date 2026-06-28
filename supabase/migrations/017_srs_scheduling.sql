-- 017: SRS（間隔反復）スケジューリング基盤
--
-- user_progress の SM-2 列（ease_factor/interval_days/repetitions/next_review_date/
-- last_reviewed_at）は schema.sql で定義済みのため、本マイグレーションは
-- ① due 抽出の高速化用インデックス と ② 想起品質3値の永続化列 のみを追加する。
-- すべて IF NOT EXISTS で冪等。Supabase ダッシュボードで手動実行する。
--
-- ⚠️ 適用前チェック（ダッシュボードで SELECT 確認）:
--   - user_progress に ease_factor/interval_days/repetitions/next_review_date/last_reviewed_at が存在
--   - unique_user_phrase (user_id, phrase_id) と RLS "Users manage own progress" が有効

-- ① due 抽出用の複合インデックス。
--   既存 idx_user_progress_next_review は next_review_date 単独で、
--   「特定ユーザーの due を期限の古い順」に引く SRS クエリと複合にならない。
CREATE INDEX IF NOT EXISTS idx_user_progress_user_due
  ON user_progress(user_id, next_review_date);

-- ② 想起品質3値（correct/partial/incorrect）を quiz_answers に永続化。
--   これまで partial は is_correct(boolean) に潰れて記録されていた。
--   SRS の grade 導出（good/hard/again）に partial を活かすために保存する。
ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS status TEXT;

-- 値域チェック（既存 NULL 行は許容しつつ新規値のみ制約）。重複追加を避けるため冪等に。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quiz_answers_status_check'
  ) THEN
    ALTER TABLE quiz_answers
      ADD CONSTRAINT quiz_answers_status_check
      CHECK (status IS NULL OR status IN ('correct', 'partial', 'incorrect'));
  END IF;
END $$;
