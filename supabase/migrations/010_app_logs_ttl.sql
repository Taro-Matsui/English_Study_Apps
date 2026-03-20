-- app_logs の自動クリーンアップ設定
-- Supabase は pg_cron 拡張を提供しているが、利用可否はプランによる
-- 以下を Supabase SQL Editor で実行する

-- 1. 30日以上古い app_logs を削除するクリーンアップ関数
CREATE OR REPLACE FUNCTION cleanup_old_app_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM app_logs WHERE created_at < NOW() - INTERVAL '30 days';
$$;

-- 2. pg_cron が使える場合は毎日 UTC 03:00 に自動実行
--    （Supabase Pro / pg_cron 有効化済みの場合のみ）
-- SELECT cron.schedule('cleanup-app-logs', '0 3 * * *', 'SELECT cleanup_old_app_logs()');

-- 3. pg_cron が使えない場合は手動で定期的に実行:
--    SELECT cleanup_old_app_logs();

-- 4. 即時クリーンアップ（初回実行・手動実行）
SELECT cleanup_old_app_logs();

-- 5. app_logs: level + created_at の複合インデックス（エラー監視クエリの高速化）
CREATE INDEX IF NOT EXISTS idx_app_logs_level_created
  ON app_logs(level, created_at DESC);
