-- phrases テーブルにカテゴリ列を追加
ALTER TABLE phrases
  ADD COLUMN IF NOT EXISTS usage_scene TEXT DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS engineer_level TEXT DEFAULT 'mid';

-- 既存レコードのデフォルト値は already applied by DEFAULT above
-- usage_scene: 'daily' | 'technical' | 'business' | 'other'
-- engineer_level: 'junior' | 'mid' | 'senior'
