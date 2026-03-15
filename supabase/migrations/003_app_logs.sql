-- アプリケーションログテーブル（A09: Security Logging and Monitoring）
CREATE TABLE IF NOT EXISTS app_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level       TEXT NOT NULL,          -- 'error' | 'warn' | 'info'
  endpoint    TEXT NOT NULL,          -- '/api/admin/import' など
  message     TEXT NOT NULL,
  detail      JSONB,                  -- 追加コンテキスト（エラー内容など）
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_logs_level      ON app_logs(level);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at DESC);

-- RLS: サービスロール（書き込み）とアノンキー（読み取り）を許可
ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for app_logs" ON app_logs FOR ALL USING (true);
