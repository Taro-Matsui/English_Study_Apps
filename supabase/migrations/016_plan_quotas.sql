-- Migration 016: plan_quotas テーブル
-- Starter プランの月次フレーズ繰越管理用

CREATE TABLE IF NOT EXISTS plan_quotas (
  user_id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rollover_phrases INT         NOT NULL DEFAULT 0,  -- 前月未使用フレーズの繰越数（上限 100）
  period_start     DATE,                            -- 今月の課金期間開始日（Stripe の period_start から設定）
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE plan_quotas ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のクォータを読み取れる（webhook/service_role が書き込み）
CREATE POLICY "users can read own quota"
  ON plan_quotas FOR SELECT
  USING (auth.uid() = user_id);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_plan_quotas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plan_quotas_updated_at
  BEFORE UPDATE ON plan_quotas
  FOR EACH ROW EXECUTE FUNCTION update_plan_quotas_updated_at();
