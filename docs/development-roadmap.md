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

---

## 7. 次サイクル: 市場投入（計器→蛇口→検証）— 2026-07-02 承認

> 出典: 6次元監査＋敵対的検証ワークフロー（27エージェント）。方針は松井承認済み。
> **確定した反論**: 「計器を最優先の前提ゲートにする」は N=0 の罠。母数ゼロでは GTM ダッシュボードは何も測れず、最初の数〜数十人の離脱は既存 Postgres タイムスタンプ（`auth.users`/`phrases`/`quiz_sessions`/`subscriptions`）＋`retention.sql` の SQL 直読で完全に追える。→ **順序は「計器→蛇口→検証」を維持しつつ、計器は"登録前だけの薄いパッチ(S)"に限定し、蛇口の配線を最優先に前倒す**。フル計装は母数が二桁に乗るまで着手禁止。

### real_bottleneck / confirmed（実コード確認済みの蛇口ブロッカー）
| # | 事実 | 影響 |
|---|---|---|
| B1 | `middleware.ts:6/9` の PUBLIC_PATHS/GUEST_PATHS に LP パスが無く、`:71-72` で未ログイン（＝Googlebot）は全て `/login` に302 | 新LPが物理的にクロール・閲覧不能＝蛇口が閉じている |
| B2 | `app/robots.ts`・`app/sitemap.ts` が不在（matcher `:107` は両者を除外済みで置けば即機能） | クローラ発見指針ゼロ |
| B3 | `share/[id]/page.tsx:141,147` の両CTA（`/quiz`・`/`）が認証必須パス | Xシェア流入者が全員 /login で死ぬ（唯一の外部露出） |
| B4 | `app/api/admin/logs/route.ts` は認可ゲート皆無（`getUser`も`ADMIN_EMAILS`も無し、`getSupabase()`） | `app_logs` の RLS 次第で認証済み他ユーザーが越境PII閲覧 |
| B5 | `/demo/extract`・`/demo/judge` は無認証Claude口・インメモリ制限（Railway再起動でリセット）・DEMO_MODEL既定Sonnet | /demo を公開入口にする瞬間に原価流出リスク |

### Tier1 — 蛇口の配線＋登録前だけの薄い計装（同一PR中心・S主体）
1. **middleware に `/phrases-for` を公開登録**（GUEST_PATHS側、`/demo`が実証済み）(S)
2. **シーンLPを seed-phrases から静的生成** `app/phrases-for/[scene]/page.tsx`＋`generateStaticParams`。**Claude生成パイプラインは組まない**（既存110フレーズで数本）(M)
3. **`app/robots.ts`/`app/sitemap.ts`＋`metadataBase`**（認証必須をDisallow・LP/demoをAllow）(S)
4. **シェア着地の両CTAを `/demo/quiz`・`/demo` へ**（B3修復）(S)
5. **`track()`＋登録前4イベント**（LP表示/demo到達/login CTA/callback到達）、GA4で自PV実測し測定ID確定 (S)
6. **別名義Google資産の棚卸し**（GTM/GA4/AdSense/OAuth の実名紐付き確認・後戻り防止）(S)

### Tier2 — 蛇口を開ける前の安全弁＋実ユーザー招待前の衛生（soon）
- Anthropic 予算アラート＋Railway 請求通知（ゼロコード暫定安全弁）(S)
- demoレート制限の永続化（`api_rate_limits` RPC へ）＋`AI_MODEL_DEMO_*` を Haiku 固定 (M)
- `quiz/judge` に日次判定上限（現状 Free は 60回/時×24=1440回/日まで無料判定可）(S)
- `admin/logs` に `getUser()`＋`ADMIN_EMAILS`＋user_idフィルタ、旧 `import`/`import-url` 残骸削除 (S)
- シェアの主役をフレーズに（B3修復とセットで意味を持つ）(S)
- Stripe `trial_will_end` 告知＋webhook case（実trialユーザー前提）(S)

### Tier3 — 母数が二桁に乗るまで後回し（feature/計器バイアス回避・着手禁止）
アプリ内フル計装 / SRSメールリマインド / due件数バッジ / 紹介報酬 / Pro差別化。

### 市場投入仮説（棄却条件つき）
| 仮説 | チャネル | 主要指標 | 棄却条件 |
|---|---|---|---|
| 用途別フレーズ学習に検索需要が実在しシーンLPが流入を生む | pSEO（別名義・無人） | 公開4週の Search 由来セッション・imp | 8週でオーガニックimp二桁/日未満 or 検索ボリューム実質ゼロ→副軸へ |
| LP流入者は認証不要/demoで1問体験すれば登録に進む | LP→/demo→/login | 3段通過率 | 最初の100セッションで LP→demo<10% or demo→login<5%→導線再設計 |
| フレーズ主役シェアはスコアシェアよりクリックを生む | 製品内ループ | 1シェア当り着地流入・着地→demo到達 | 母数二桁でクリック率1%未満→副軸縮退 |
| 14日Proトライアル→有料がCAC≈¥60で成立 | trial→paid | period_end後の継続率 | 無言満了/即解約が支配的→価格・プラン再検証（母数出るまで保留） |

### First Sprint（1〜2週・実装スコープ）
1. **WebSearch で狙うクエリの検索ボリューム・競合確認 → 2〜3本確定**（本文生成より前）
2. middleware に `/phrases-for` 公開登録
3. `app/phrases-for/[scene]/page.tsx` を seed-phrases から静的生成（CTA→`/demo/import`）
4. `app/robots.ts`/`app/sitemap.ts`＋`metadataBase`
5. `share/[id]` の両CTA を `/demo/*` へ
6. `track()`＋登録前4イベント、GA4自PV実測で測定ID確定
7. Anthropic 予算アラート＋Railway 請求通知（松井・ゼロコード）

### 事業視点（誰が推進する／動機）
COI で実名PR・コミュニティ・法人営業は禁じ手 → 獲得は SEO と製品内シェアの**2つの無人チャネル**のみで成立させる。SEO推進動機＝`seed-phrases.ts` の約110フレーズが既にキュレーション済みで生成パイプライン不要・追加API費用ゼロ・静的配信無料。シェア推進動機＝別名義の匿名学習記録として実名を晒さず回せる（ただしB3修復が前提）。

### 順序（Sequencing）
計器の第一歩（登録前track＋GA4自PV実測＋別名義資産棚卸し）→ 蛇口を物理的に開ける同一PR（クエリ確認→middleware→シーンLP→robots/sitemap→登録前計装→シェアCTA修復）→ 蛇口を開ける前の安全弁（原価アラート→demo制限永続化+Haiku固定→judge日次上限→admin/logs封鎖）→ 検証（実流入で登録前ファネルをSQL/GA4で読み kill_criteria 照合）→ 母数二桁でTier3を実データで正当化してから着手。
