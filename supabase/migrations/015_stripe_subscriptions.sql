-- migration 015: Stripe サブスクリプション管理テーブル
-- Supabase Dashboard > SQL Editor で実行する

CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT        UNIQUE,
  stripe_customer_id     TEXT,
  plan                   TEXT        NOT NULL DEFAULT 'free', -- 'free' | 'starter' | 'pro'
  status                 TEXT        NOT NULL DEFAULT 'active', -- 'active' | 'canceled' | 'past_due' | 'trialing'
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx ON subscriptions (stripe_customer_id);

-- RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のサブスク情報のみ読める
CREATE POLICY "users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 書き込みは service_role キーのみ（webhook 経由）
-- INSERT / UPDATE / DELETE は RLS ポリシーを設けず service_role に委ねる
