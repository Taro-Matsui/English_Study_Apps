-- phrases をユーザー別プライベートライブラリに変更
-- 実行前に既存データの扱いを決定すること（user_id=NULL のデータはRLS適用後に見えなくなる）

ALTER TABLE phrases
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- RLS: 自分のフレーズのみ全操作可能（旧ポリシーを削除して置き換え）
ALTER TABLE phrases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow all" ON phrases;
DROP POLICY IF EXISTS "Allow all" ON phrases;
DROP POLICY IF EXISTS "Allow all for service role" ON phrases;

CREATE POLICY "Users manage own phrases"
  ON phrases FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
