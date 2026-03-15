-- phrases テーブルに論理削除列を追加
ALTER TABLE phrases
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delete_reason TEXT DEFAULT NULL;

-- delete_reason: 'product_name' | 'not_phrase'
-- product_name: 特定の製品・機能名
-- not_phrase: 慣用句ではない一般的な単語
