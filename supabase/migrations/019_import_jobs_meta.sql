-- 自動タグ: 抽出時に AI が推定するソースのメタ情報（title / date / topics）を保存する。
-- extract-phrases が返す SourceMeta を import_jobs.meta に格納し、
-- 保存画面（jobs/[id]）でタイトル・日付・テーマの既定値として使う。
-- ※ Supabase ダッシュボードで手動実行（既存 migration 運用と同じ）。
--   未適用でもアプリは安全に動作する: import-async は本体更新（status/phrases/source_name）と
--   meta 書き込みを分離し、meta は best-effort（列が無ければ警告ログのみでスキップ）。
--   適用後に meta（title/date/topics）が保存され、保存画面の既定値に反映される。

ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS meta JSONB;
