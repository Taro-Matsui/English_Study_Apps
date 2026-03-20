-- Migration 012: Add explanation cache column to phrases
-- AI解説を phrases テーブルにキャッシュし、2回目以降の解説リクエストを即時返却する

ALTER TABLE phrases ADD COLUMN IF NOT EXISTS explanation TEXT;

COMMENT ON COLUMN phrases.explanation IS 'AI生成の解説テキスト（語源・ニュアンス・使用場面・注意点）。初回リクエスト時に生成・キャッシュされる。';
