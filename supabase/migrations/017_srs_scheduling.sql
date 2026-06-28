-- 017: SRS（間隔反復）スケジューリング基盤
--
-- user_progress の SM-2 列（ease_factor/interval_days/repetitions/next_review_date/
-- last_reviewed_at）は schema.sql で定義済みのため、本マイグレーションは
-- ① due 抽出の高速化用インデックス と ② 既存(レガシー)行のスケジュール正規化 を行う。
-- すべて冪等。Supabase ダッシュボードで手動実行する。
--
-- ⚠️ 適用前チェック（ダッシュボードで SELECT 確認）:
--   - user_progress に ease_factor/interval_days/repetitions/next_review_date/last_reviewed_at が存在
--   - unique_user_phrase (user_id, phrase_id) と RLS "Users manage own progress" が有効
--
-- 注: 想起品質(status)は complete でリクエストから直接 grade 導出に使うため
--     quiz_answers へは保存しない方針。よって status 列は追加しない。

-- ① due 抽出用の複合インデックス。
--   既存 idx_user_progress_next_review は next_review_date 単独で、
--   「特定ユーザーの due を期限の古い順」に引く SRS クエリと複合にならない。
CREATE INDEX IF NOT EXISTS idx_user_progress_user_due
  ON user_progress(user_id, next_review_date);

-- ② レガシー行のスケジュール正規化（一度だけ実行される想定）。
--   SRS 導入前に /api/user/progress 経由で作られた行は next_review_date が
--   作成日(過去)・repetitions=0 のため、放置すると「習得済みのはずが全件 due」に
--   なってしまう。SRS が一度でも触れた行(last_reviewed_at IS NOT NULL)は対象外に
--   して、既存スケジュールを壊さない。
--   - is_mastered=true の行 → 末尾段相当(rep=5, interval=70)で 70 日後に再出題
--   - それ以外の行         → 今日 due（rep=0, interval=1）として SRS に取り込む
UPDATE user_progress
   SET repetitions = 5,
       interval_days = 70,
       next_review_date = CURRENT_DATE + 70,
       updated_at = NOW()
 WHERE last_reviewed_at IS NULL
   AND is_mastered = true;

UPDATE user_progress
   SET repetitions = 0,
       interval_days = 1,
       next_review_date = CURRENT_DATE,
       updated_at = NOW()
 WHERE last_reviewed_at IS NULL
   AND (is_mastered = false OR is_mastered IS NULL);
