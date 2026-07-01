# Pick 開発ロードマップ

> 最終更新: 2026-06-28 / 出典: 評議会による改善計画・獲得戦略（2026-06-27）+ Sprint 1・2 実装結果

実際の会話・文書から英語フレーズをピックして学ぶアプリ Pick（https://usepick.win）の開発計画。
評議会（改善7役 + 獲得7役）の結論を起点に、実装の進捗・確定した設計判断・今後の優先度をTier分けで管理する。

---

## 1. 進捗サマリ

| Sprint | 範囲 | 状態 |
|---|---|---|
| **Sprint 1** | Tier1 改善6施策 | ✅ 完了・本番反映（master `b0c119a`） |
| **Sprint 2** | SRS（間隔反復） | ✅ 完了・本番反映（master `7d81a69`） |

### Sprint 1 — Tier1 改善6施策（すべて完了）
| # | 施策 | 実装 |
|---|---|---|
| T1-1 | 採点の原価上限化 | 前段フィルタ強化（`lib/answer-match.ts`、完全一致/区切り要素/部分包含でLLMスキップ率向上）。**Free採点上限は見送り**（下記「確定判断」） |
| T1-2 | 供給保証 | 目的別シードを各5→15件に拡充（計155件、`lib/seed-phrases.ts`）。`source_type='System'` をフレーズ枠カウントから除外。既存ユーザーへは冪等バックフィル（`scripts/backfill-seeds.ts`）で補填済み |
| T1-3 | 供給継続率の計測 | `supabase/analytics/retention.sql`（7日内2本目投入率 / 14日供給継続率 / 週次コホート供給数）。Supabase SQL Editor で実行 |
| T1-4 | オンボ直後の1問ミニチャレンジ | オンボ完了直後に1問を出題（`onboarding/page.tsx` の `mini_challenge`）。クォータ非消費 |
| T1-5 | ソース由来の可視化 | `components/SourceBadge.tsx` をチャレンジ結果・記録に表示。System シードは「Pick からのおすすめ」表示 |
| T1-6 | 5問1セットの区切り | 5問ごとにセット完了インタースティシャル（案A、総問数10は維持） |

### Sprint 2 — SRS（間隔反復）
- 軽量SRS: 固定拡張間隔 **STEPS=[1,3,7,16,35,70]** + 想起 + 誤答リセット（純粋関数 `lib/srs.ts`、64テスト緑）。
- 出題を due（`next_review_date <= 今日`）優先化（`quiz/route.ts`）。完了時に `user_progress` を更新（`complete/route.ts`）。
- 既存の `user_progress`（SM-2列・RLS・index）を流用したため新テーブル不要。`migration 017`（due用複合index + レガシー行正規化）適用済み。
- エビデンス: SRSの有効性は deep-research でゴールドスタンダードとして確証済み（Cepeda 2006 ほか）。

---

## 2. 確定した設計判断（以後の前提）

| 論点 | 判断 | 理由 |
|---|---|---|
| Free のAI採点上限 | **導入見送り**（前段フィルタ強化のみ） | 無料体験価値とCVRを守る。原価は前段フィルタとセッション上限で抑制。効果測定後に再判断 |
| System シードのクォータ | **枠から除外** | Free 実質枠 = 自前60件 + シード（供給保証）。CLAUDE.md 反映済み |
| focus（ピックアップ チャレンジ） | **SRS due に一本化** | 出題ロジックを一系統に。誤答は翌日 due で復習（当日その場復習は廃止） |
| 習熟管理 | **SRS に一本化** | 旧 localStorage masteredId / skipMastered は撤去。is_mastered は SRS から派生 |
| 通知 | **Push 先行は却下**（メールは候補） | 通知の効果量（1.5〜3倍等）は反証で却下。誇大値を前提にしない |

---

## 3. 運用ステータス

- ✅ migration 017 適用済み（Supabase）
- ✅ 既存ユーザーへのシード補填（backfill `--apply`）実行済み・冪等確認済み
- ⏳ **migration 019 適用**（`import_jobs.meta` = 自動タグ）: Supabase SQL Editor で [`supabase/migrations/019_import_jobs_meta.sql`](../supabase/migrations/019_import_jobs_meta.sql) を実行（1行・未適用でもアプリは安全＝meta は best-effort）
- ⏳ SRS due 順の実機スモーク確認（推奨: チャレンジ→完了→再開で正解語が即再出題されないこと）
- 📌 品質担保: master 反映前に**敵対的レビュー・ワークフロー**を2回実施し、実害バグ（課金枠が緩む NULL 除外、SRS進捗を全消去する設定リセット 等）を捕捉・修正
- ✅ 自動QA: 単体/統合テスト 111件（`vitest`、TZ を Asia/Tokyo 固定＝CI の UTC 差異を解消）・CI ワークフロー（[.github/workflows/ci.yml](../.github/workflows/ci.yml)、test+build）・coverage 計測（v8）を整備
- ✅ **CI ゲート化（観点#1・ソフトゲート適用済み 2026-07-02）**: master ブランチ保護を API で設定（PR必須/承認0・`verify` 必須/strict・force-push/削除禁止・**enforce_admins=false**＝管理者は緊急時に直接push可でロックアウト無し）。手順と構成は [docs/branch-protection-and-ci.md](branch-protection-and-ci.md)。**ハードゲート化（enforce_admins=true）と Railway「Wait for CI」は任意で追加可**
- ✅ E2E スモーク（観点#3）: pick-verify 土台の [.github/workflows/e2e.yml](../.github/workflows/e2e.yml)（手動 `workflow_dispatch` / 夜間定期・読み取り系のみで AI コスト無し）。login→主要ルートのレンダリング確認。**要 secrets: `PICK_TEST_EMAIL` / `PICK_TEST_PASSWORD`**（確認済みテスト垢／未設定時はスキップ）

---

## 3.5 追加で出荷した施策（2026-06-28）

- ✅ **UI 設計言語「Trusted Teal」**（master 945643a）: 色の三分裂・低コントラストを解消し primary をティールに一本化。トークン(brand/ground/line/ink)を tailwind に定義。登録前デモのブランド統一・LP誤記是正・demo/quiz の hydration 修正も同梱。
- ✅ **産出モード（Tier3 前倒し / master e347ab2）**: SRS連動で repetitions≥2 のフレーズを「意味→英語」出題に自動昇格。「分かったつもり」を潰し『使える英語』訴求を実装で裏打ち。発音ASRには踏み込まない（コスト/堀の方針維持）。
- ✅ **Pro 14日トライアル（Tier2 / master e347ab2）**: カード登録あり・終了後自動課金。未契約のみ付与し Stripe を真実源に再トライアル濫用を防止。

## 4. 次の開発候補（Tier別・優先度順）

### Tier 2 — 収益とリテンションの土台
| 候補 | 内容 | 事業観点 |
|---|---|---|
| ~~Pro トライアル~~ ✅出荷 | 14日無料・カードあり・自動課金 | 有料転換の主導線。出荷済み（効果測定へ） |
| **チャーン防衛**（一部出荷✅） | ✅Dunningバナー(past_due→支払い更新)＋解約理由ロギング出荷。残: 解約予定(cancel_at_period_end)の可視化＋winback（要 migration・母数育成後） | LTV防衛。意図せぬ解約(失敗カード)の回収導線を実装済み |
| **メール通知（控えめに）** | due 復習リマインドをメールで（Push は不採用） | 効果量は未検証前提でA/B。COI上、外部送信は別名義基盤で |
| 継続率ダッシュボードのアプリ化 | T1-3 のSQLを管理画面化（**要: 管理者ゲート追加**） | 現状 `app/api/admin/*` は無認証。可視化の前に認証必須 |

### Tier 3 — SRSの高度化（効果測定後）
- ease_factor を使う SM-2 full 化（現在は温存中。固定間隔で十分かをデータで判断）
- ~~産出方向クイズ（日→英）~~ ✅出荷（SRS連動・rep≥2で自動昇格）
- 「今日の復習n件」表示・復習専用クォータ（`session_type='review'` の布石は実装済み）
- 産出UI文言の i18n（英語化）・トライアルの DB一意制約による並列二重発火の完全防止（残課題）

---

## 5. 獲得戦略（COI制約が最優先）

> ⚠️ **COI制約**: 実名・所属を出すPR/コミュニティ発信/職務人脈での法人営業は禁じ手（VPMK取引先との重複リスク）。実行は**完全別名義の個人開発**として会社の看板を切り離すことが絶対条件。

- **主軸**: プログラマティックSEO（用途別フレーズLP群）
- **副軸**: 製品内ループ（シェア主役をフレーズ化 / 1問お試し着地 / 紹介報酬=フレーズ枠）
- **初速**: PR単発砲（別名義）

---

## 6. 効果測定（未検証 → 実データで判断）

価格・LTV・通知効果・競合防御性は本リサーチ未検証。断定せず実ユーザーでA/B検証する。
- T1-3 の継続率SQLを定点観測のベースラインに
- Free採点上限 / メール通知 / 価格改定 は導入前後で計測してから判断
