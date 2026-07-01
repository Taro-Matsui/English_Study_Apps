## 概要

<!-- 何を・なぜ変えるか。1〜3行 -->

## 変更点

<!-- 主要な差分。ファイル/挙動 -->

## セルフチェック（マージ前）

- [ ] `npm run test` が緑（CI の `verify` でも確認）
- [ ] `npm run build` が通る（型エラーなし）
- [ ] 触ってはいけない領域に手を入れていない、または意図して変更した
  - save の `ALLOWED_SOURCE_TYPES` / plan-quota の `System` 除外（`.or('source_type.is.null,source_type.neq.System')`）/ ミドルウェアの `PUBLIC_PATHS` / Supabase クライアント使い分け（Route Handler は `getSupabaseAdmin()`＋`.eq('user_id', user.id)`）
- [ ] 一覧・クイズ取得クエリに `.is('deleted_at', null)`（論理削除）を付けた
- [ ] DB マイグレーションの要否を確認（要なら `supabase/migrations/NNN_*.sql` を追加し手動適用手順を記載）
- [ ] モバイル規約（input `fontSize:16px` 等）を満たす
- [ ] 抽出/採点/クォータ/認証/課金に触れる変更は、仕様を推測せず実コードで挙動を確認した

## 影響範囲 / 後方互換

<!-- DB・既存データ・デプロイへの影響。無ければ「なし」 -->
