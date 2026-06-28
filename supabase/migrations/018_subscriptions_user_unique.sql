-- 018: subscriptions を「1ユーザー1行」に統一（再トライアル/重複行の防止・堅牢化）
-- Supabase Dashboard > SQL Editor に貼り付けて実行する。冪等（再実行しても安全）。
--
-- 背景: subscriptions は stripe_subscription_id のみ UNIQUE で user_id に一意制約が無いため、
-- 理論上 1ユーザーに複数行が生じうる（webhook の再送・経路差で発生し得る）。複数行があると
-- checkout のトライアル適格判定やサブスク状態取得が非決定的になる。これを1行に統合し
-- user_id へ UNIQUE を張ることで判定を決定的にする。
--
-- 注: アプリ側 webhook は onConflict に依存しない update-then-insert（user_id 基準）に
--     変更済みのため、本マイグレーションは適用前後どちらでもアプリは正しく動作する。

-- ① 重複行の統合: user_id ごとに最新(created_at, id が最大)の1行だけ残し、古い行を削除
DELETE FROM subscriptions a
USING subscriptions b
WHERE a.user_id = b.user_id
  AND (a.created_at < b.created_at
       OR (a.created_at = b.created_at AND a.id < b.id));

-- ② user_id に UNIQUE 制約を付与（未付与のときのみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_user_id_unique'
  ) THEN
    ALTER TABLE subscriptions
      ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);
  END IF;
END $$;
