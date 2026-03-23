# Pick — Claude Code Guide

## 概要
実際の会話・文書から英語フレーズをピックして学ぶアプリ。
テキストをアップロード → Claude がフレーズ抽出 → チャレンジで定着。**マルチユーザー対応**（Supabase Auth + RLS）。

タグライン（JA）: 会話からフレーズをピックして学ぼう
タグライン（EN）: Pick the words from your real conversations.

## スタック
- **Framework**: Next.js 14 App Router (TypeScript)
- **DB**: Supabase (PostgreSQL + RLS、ユーザー別データ分離)
- **Auth**: Supabase Auth (メール+パスワード / Google OAuth) + `@supabase/ssr`
- **LLM**: Claude API via `fetch` (SDK 不使用 — Railway 接続問題を回避)
  - 抽出: `claude-sonnet-4-6`, max_tokens: 8192
  - 判定: **プラン依存** — Pro: `claude-sonnet-4-6`, Free/Starter: `claude-haiku-4-5-20251001`（`lib/plan-quota.ts` の `getJudgeModel()` で決定）
  - 解説: `claude-haiku-4-5-20251001`, max_tokens: 600
- **UI**: Tailwind CSS + shadcn/ui。`darkMode: ["class"]` で `.dark` を `<html>` に付与
- **Analytics**: GTM-PWNWXD23 (`@next/third-parties/google`)
- **AdSense**: `ca-pub-3375981541016037` — `<head>` 直接埋め込み（GTM 非経由、クローラー検知目的）
  - 手動配置のみ: `AdBanner` コンポーネントをクイズ完了後・インポート完了後の2箇所に限定
  - **自動広告は AdSense ダッシュボードでオフ必須**（手動配置と重複するため）
- **Deploy**: Railway (master push → 自動デプロイ)

## 主要ファイル構成
```
app/
  page.tsx               # ホーム (force-dynamic)
  login/page.tsx         # ランディングページ兼ログイン・新規登録
  onboarding/page.tsx    # 学習アンケート + 英語力チェック（初回 + 再編集可）
  quiz/page.tsx          # チャレンジ (Client Component)
  history/page.tsx       # チャレンジ記録 + X シェア
  settings/page.tsx      # 設定（音声/クイズ/テーマ/学習プロフィール）
  streak/page.tsx        # 学習カレンダー（過去6ヶ月、正解率別色分け）
  phrases/page.tsx       # フレーズ一覧 + 論理削除
  library/import/        # テキストインポート（完了後に AdBanner 表示）
  library/jobs/[id]/     # ジョブ詳細 + フレーズ保存
  privacy|terms|about|contact/page.tsx  # 法的ページ（認証不要 PUBLIC_PATHS）
  api/user/onboarding/   # 学習設定保存 + シードフレーズ挿入
  api/quiz/              # 出題 / AI判定 / 完了保存 / フレーズ解説
  api/quiz/daily-count/  # 本日のチャレンジ数取得（HomeContent のクォータ表示用）
  api/phrases/count/     # フレーズ数 + クォータ情報取得（import ページ表示用）
  api/admin/             # インポートジョブ管理（/library の前身）
  api/stripe/            # checkout / webhook / portal / subscription
  settings/billing/      # プラン選択・年払い/月払いトグル・管理ポータル

lib/
  supabase.ts            # getSupabase() / getSupabaseAdmin()
  supabase-server.ts     # createSupabaseServerClient() — Server Component / Route Handler
  supabase-browser.ts    # createBrowserSupabaseClient() — singleton (createBrowserClient)
  auth.ts                # getUser() — Route Handler 認証チェック
  auth-context.tsx       # UserProvider / useAuth() — getSession() ベース
  extract-phrases.ts     # Claude API + JSON 部分回復
  subscription.ts        # getUserSubscription() / Plan 型 / PLAN_PRICES
  plan-quota.ts          # checkPhraseQuota / checkDailyPracticeQuota / checkMonthlyFeedbackQuota / getJudgeModel
  stripe.ts              # getStripe() シングルトン
  ai-models.ts           # AI_MODELS 定数（env 変数で上書き可）
  announcements.ts       # お知らせデータ（先頭に追記で全ユーザーへ通知）
  share-image.ts         # Canvas 1200×630px PNG 生成・X シェア
  settings.tsx           # localStorage 設定（音声/クイズ/テーマ）
  i18n.tsx               # JA/EN 切り替え

components/
  AdBanner.tsx           # AdSense 手動配置（slot 空なら null を返す）
  AnnouncementBell.tsx   # お知らせベル（localStorage 既読管理）
  HomeContent.tsx        # ホーム画面 Client Component
  WelcomeGuide.tsx       # 初回チュートリアル（最終スライドで /library/import へ遷移）
  HintBubble.tsx         # 操作ヒントポップアップ（onClickCapture で dismiss）
  ThemeProvider.tsx      # ダークモード切り替え

public/ads.txt           # AdSense 所有権確認
middleware.ts            # セッションリフレッシュ + ルート保護 + オンボーディング誘導
```

## Supabase クライアント使い分け（最重要）

| 用途 | 関数 | キー |
|------|------|------|
| Route Handler 認証チェック | `getUser()` (lib/auth.ts) | ANON (Cookie) |
| Route Handler DB 操作 | `getSupabaseAdmin()` (lib/supabase.ts) | SERVICE_ROLE |
| Client Component 認証 | `useAuth()` (lib/auth-context.tsx) | ANON (Cookie) |
| Client Component 直接 Auth 操作 | `createBrowserSupabaseClient()` | ANON (Cookie) |

**⚠️ 重要ルール:**
- Route Handler では **全テーブル** `getSupabaseAdmin()` を使い、必ず `.eq('user_id', user.id)` でフィルタ
  → `getSupabase()` (ANON key) は Route Handler では `auth.uid()` が null になりデータが 0 件になる
- `createBrowserSupabaseClient()` は `createBrowserClient` ベースの**シングルトン**
  → 複数箇所で呼んでも同一インスタンス。`onAuthStateChange` リスナーが共有される

## 認証フロー
```
/login → signUp() → 確認メール → /auth/callback → exchangeCodeForSession()
       → middleware: onboarding_complete チェック
       → 未完了 → /onboarding → アンケート + 英語力チェック → saveAndRedirect()
           └ saveAndRedirect() 内で必ず refreshSession() を await してから router.push()
       → 完了 → / → WelcomeGuide（初回のみ）→ HintBubble（チュートリアル後）
```

**⚠️ JWT 更新の落とし穴:**
`admin.updateUserById` で user_metadata を更新しても、クライアントの JWT は即座に更新されない。
`auth-context.tsx` の `useAuth()` は `getSession()` ベースのため、**refreshSession なしでは古い metadata を返す**。
オンボーディング保存後は `await createBrowserSupabaseClient().auth.refreshSession()` が必須。

## ユーザー設定（user_metadata）— 2 階層構造
```typescript
type StudyPurpose    = 'business_general' | 'business_engineer' | 'hobby_lifestyle' | 'hobby_reading'
type StudySubcategory = 'meeting' | 'review' | 'conference'  // business_engineer 選択時のみ

{
  study_purpose:     StudyPurpose
  study_subcategory: StudySubcategory | undefined  // business_engineer のみ
  study_level:       'beginner' | 'intermediate' | 'advanced'
  study_domain:      string | undefined  // 最大100文字
  onboarding_complete: true
}
```
- シードフレーズ選択: `seedKey = study_subcategory ?? study_purpose`
- 旧値 (`meeting` / `review` / `reading` / `interview` / `general`) は後方互換で VALID_PURPOSES に残す
- 英語力チェック（多肢選択）はオンボーディング時のみ実施（編集モードはスキップ）

## クイズ仕様

### 出題優先順 (quiz/route.ts)
**新規フレーズ（直近7日以内）→ 通常 → quickMastered**
- `mode=normal`: quickMastered（直近10セッションで3回以上 <3500ms 正解）を末尾に降格
- `mode=focus`: 直近5セッションで2回以上不正解を優先（不足時は normal にフォールバック）

### 回答フロー
- テキスト入力 → 「回答する」→ Claude Haiku で AI 採点
- **「分かりません」ボタン**: AI 採点スキップ → incorrect 記録 + 解説自動取得
- 不正解・部分正解: `handleExplain()` を自動呼び出し（AI 解説を即表示）
- 正解: 「解説を見る」ボタンで任意取得
- レスポンスタイム: `Date.now()` で計測 → `quiz_answers.response_time_ms` に保存

## お知らせシステム
`lib/announcements.ts` の配列**先頭**に追記するだけ。新しい `id` が追加されると全ユーザーの AnnouncementBell に未読バッジが表示される。`lib/settings/` の `seen_announcements` キーで既読管理。

## X シェア
- Canvas API で 1200×630px PNG 生成 → Supabase Storage にアップロード → Twitter Cards 表示
- `share-image.ts`: `generateQuizResultImage()` → `uploadShareImage()` → `openXShare()`
- **Safari 対策**: タブがフォアグラウンドのうちに（チャレンジ完了時 handleNext 内で）先行アップロード
  → `window.open()` 後は Safari がタブを suspend するため、シェアボタン押下前にアップロード完了が必須
- `window.open()` は click ハンドラ内で同期的に呼ぶこと（await 挟むと Safari ポップアップブロック）
- OG 画像: `app/api/og/route.tsx`（edge runtime, ImageResponse, 1200×630, pick_logo.png 表示）
- シェアページ: `app/share/[id]/page.tsx`（PUBLIC_PATHS に含める）

## ブランド用語（Pick）
- ピックする: フレーズを選び取る行為（動詞）
- チャレンジ: クイズ画面（/quiz）
- チャレンジ記録: 回答履歴（/history）
- マイピックリスト: ピック済みフレーズ一覧（/phrases）
- 出会いから英語をピックする: ソース追加 CTA（/library/import）
- ピックアップ チャレンジ: 間違えたフレーズの復習モード（mode=focus）
- 連続日数: Pick Streak（/streak）
- 📕 詳細は `docs/brand-terminology.md` 参照

## DB スキーマ（非自明なカラムのみ）
```sql
phrases:        deleted_at TIMESTAMPTZ  -- 論理削除（必ず .is('deleted_at', null) でフィルタ）
                explanation TEXT         -- AI 解説キャッシュ（migration 012）
                added_date DATE          -- 新規フレーズ優先出題のキー
quiz_answers:   response_time_ms INT     -- 回答速度（migration 013）
                status TEXT              -- 'correct'|'partial'|'incorrect'
subscriptions:  plan TEXT                -- 'free'|'starter'|'pro'（migration 015）
                status TEXT              -- 'active'|'canceled'|'past_due'|'trialing'
                stripe_customer_id TEXT
                stripe_subscription_id TEXT
                current_period_end TIMESTAMPTZ
plan_quotas:    rollover_phrases INT     -- Starter: 前月繰越フレーズ数（上限100）（migration 016）
                period_start DATE        -- 今月の課金期間開始日
```
マイグレーションは `supabase/migrations/001〜016.sql`（全て Supabase ダッシュボードで手動実行済み）。

## 重要パターン

### 論理削除
一覧・クイズ取得クエリには必ず `.is('deleted_at', null)` を付ける。

### JSON 部分回復 (extract-phrases.ts)
Claude の max_tokens 超過で JSON 切断時の3段階フォールバック:
1. `JSON.parse()` 直接
2. 未エスケープ改行をサニタイズして再試行
3. `{}` ブレース数えで完結オブジェクトを個別抽出

### Railway リバースプロキシ対応
`auth/callback/route.ts` では `request.url` が `localhost:8080` になるため、
`x-forwarded-host` / `x-forwarded-proto` から正しい origin を構築する。

### AdBanner
`slot` が空文字なら `null` を返す（env 未設定時の安全対策）。`useRef` で二重 push 防止。

### プランゲート（lib/plan-quota.ts）
新機能でプラン制限が必要な場合は `lib/plan-quota.ts` に関数を追加し、Route Handler で呼ぶ。

```typescript
// パターン: import-async と同様
const sub = await getUserSubscription(user.id)
const quota = await checkXxxQuota(user.id, sub.plan)
if (!quota.allowed) {
  return NextResponse.json({ error: '...上限...', upgrade: true }, { status: 403 })
}
```

**制限値まとめ:**
| 機能 | Free | Starter | Pro |
|------|------|---------|-----|
| フレーズ | 累計 60件 | 月 300+繰越(max100)件 | 無制限 |
| チャレンジ/日 | 5回 | 10回 | 10回 |
| AI判定/月 | 無制限（60件以内） | 30回 | 無制限 |
| 判定モデル | Haiku | Haiku | Sonnet |

### Stripe priceKey allowlist
`checkout/route.ts` の `priceMap` に登録された4キーのみ受け付ける。
`'starter_monthly' | 'starter_yearly' | 'pro_monthly' | 'pro_yearly'`

### ミドルウェア PUBLIC_PATHS
```typescript
const PUBLIC_PATHS = ['/login', '/auth/callback', '/share', '/api/og',
                      '/privacy', '/terms', '/about', '/contact',
                      '/api/stripe/webhook']
```
新しい公開ページを追加したら必ずここにも追加する。

## セキュリティ
- UUID v4 バリデーション: phrases/[id]、jobs/[id]
- 入力長制限: phrase(200) / user_answer(500) / context(1000) / file(2MB, 200k chars) / domain(100)
- allowlist バリデーション: source_type / delete_reason / study_purpose / study_level
- PostgREST インジェクション: `.or()` 文字列から `%_,.()*"'` をストリップ
- SSRF 対策: import URL のプライベート IP 拒否 (`isAllowedHost`)
- Security headers: X-Frame-Options, CSP, HSTS 等 (`next.config.mjs`)

## 環境変数
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY           # Route Handler DB 操作に必須（Railway 要設定）
ANTHROPIC_API_KEY
NEXT_PUBLIC_ADSENSE_SLOT_QUIZ       # 7170940471
NEXT_PUBLIC_ADSENSE_SLOT_IMPORT     # 6300711931

# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_STARTER_MONTHLY        # ¥180/月 の price ID
STRIPE_PRICE_STARTER_YEARLY         # ¥1,800/年 の price ID（任意）
STRIPE_PRICE_PRO_MONTHLY            # ¥480/月 の price ID
STRIPE_PRICE_PRO_YEARLY             # ¥4,800/年 の price ID（任意）
```

## モバイル対応
- input の `font-size` は必ず `style={{ fontSize: '16px' }}`（iOS Safari 自動ズーム防止）
- `min-h-screen`（100vh）を使用。`min-h-[100dvh]` はキーボード展開時にレイアウトシフト発生
- 戻るボタン: `text-2xl p-2 -ml-2`（約40px タップ領域）

## PWA
- `app/manifest.ts` — name: "Pick", short_name: "Pick"
- `app/icon.png` — `public/pick_logo.png` を `app/` にコピーして使用（静的ファイルで edge runtime 不要）
- Apple icon: `layout.tsx` の `icons.apple` → `/pick_logo.png` 参照

## デプロイ
```bash
npm run build  # TypeScript 型エラーで落ちることが多い。push 前にローカル確認
git add <files> && git commit -m "..." && git push origin master
# Railway が master push を検知して自動ビルド・デプロイ
```
