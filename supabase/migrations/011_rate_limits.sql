-- Claude API エンドポイントのレート制限用テーブル
-- user_id + endpoint + window_key（時間単位）で件数を管理

CREATE TABLE IF NOT EXISTS api_rate_limits (
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL,
  window_key TEXT        NOT NULL,  -- 例: "2026032015" (YYYYMMDDHH)
  count      INTEGER     NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, endpoint, window_key)
);

-- 古いウィンドウのレコードを定期削除（24時間以上前）
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM api_rate_limits WHERE updated_at < NOW() - INTERVAL '24 hours';
$$;

-- RLS 有効化（service role でのみ操作するためポリシーは不要だが、誤アクセス防止）
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- アトミックなレート制限チェック関数
-- 戻り値: 制限超過なら true、通過なら false（同時に count を +1）
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  p_user_id    UUID,
  p_endpoint   TEXT,
  p_window_key TEXT,
  p_limit      INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO api_rate_limits (user_id, endpoint, window_key, count, updated_at)
  VALUES (p_user_id, p_endpoint, p_window_key, 1, NOW())
  ON CONFLICT (user_id, endpoint, window_key)
  DO UPDATE SET
    count      = api_rate_limits.count + 1,
    updated_at = NOW()
  RETURNING count INTO v_count;

  RETURN v_count > p_limit;
END;
$$;
