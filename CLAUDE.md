# Engineer English App — Claude Code Guide

## 概要
エンジニア向け英語フレーズ学習アプリ。
会話録・ドキュメントをアップロード → Claude がフレーズ抽出 → クイズで学習。
**マルチユーザー対応済み**（Supabase Auth + RLS）。

## スタック
- **Framework**: Next.js 14 App Router (TypeScript)
- **DB**: Supabase (PostgreSQL + RLS、ユーザー別データ分離)
- **Auth**: Supabase Auth (メール+パスワード) + `@supabase/ssr` (Cookie セッション)
- **LLM**: Claude API via `fetch` (SDK 不使用 — Railway 接続問題を回避)
  - 抽出: `claude-sonnet-4-6`, max_tokens: 8192
  - 判定: `claude-haiku-4-5-20251001`, max_tokens: 300
  - 解説: `claude-haiku-4-5-20251001`, max_tokens: 600
- **UI**: Tailwind CSS + shadcn/ui (dark: `bg-slate-900`)
- **Deploy**: Railway (master push → 自動デプロイ)

## ディレクトリ構成
```
app/
  page.tsx                    # ホーム (force-dynamic, user-specific stats)
  login/page.tsx              # ログイン・新規登録フォーム
  onboarding/page.tsx         # 学習アンケート（初回 + 再編集可）
  phrases/page.tsx            # フレーズ一覧 + 論理削除
  quiz/page.tsx               # クイズ (Client Component)
  history/page.tsx            # チャレンジ記録
  settings/page.tsx           # 設定（音声/クイズ/学習プロフィール）
  admin/
    import/page.tsx           # テキストインポート
    jobs/page.tsx             # ジョブ一覧
    jobs/[id]/page.tsx        # ジョブ詳細 + フレーズ保存
  auth/callback/route.ts      # メール確認コールバック
  api/
    auth/signout/route.ts     # サインアウト
    user/onboarding/route.ts  # 学習設定保存 + シードフレーズ挿入
    phrases/route.ts          # GET: 一覧 (user_id フィルタ)
    phrases/[id]/route.ts     # PATCH: 論理削除 (user_id 一致チェック)
    quiz/route.ts             # GET: ランダム出題 (user_id フィルタ)
    quiz/judge/route.ts       # POST: AI判定
    quiz/complete/route.ts    # POST: セッション保存
    quiz/explain/route.ts     # POST: フレーズ詳細解説 (Claude Haiku)
    admin/import-async/route.ts  # POST: 非同期インポートジョブ作成
    admin/save/route.ts          # POST: フレーズ DB 登録 (upsert)
    admin/jobs/route.ts          # GET: ジョブ一覧 (user_id フィルタ)
    admin/jobs/[id]/route.ts     # GET: ジョブ詳細
    history/route.ts             # GET: クイズ履歴 (user_id フィルタ)
    stats/route.ts               # GET: ユーザー別 phrase/source 件数

lib/
  supabase.ts           # getSupabase() / getSupabaseAdmin()
  supabase-server.ts    # createSupabaseServerClient() — Cookie aware, Server only
  supabase-browser.ts   # createBrowserSupabaseClient() — Client Component 用
  auth.ts               # getUser() — Route Handler 用サーバー認証チェック
  auth-context.tsx      # UserProvider / useAuth() — Client Component 用
  extract-phrases.ts    # Claude API 呼び出し + JSON 部分回復 + UserContext
  logger.ts             # 構造化ログ (console + app_logs テーブル)
  parse-transcript.ts   # テキスト前処理
  i18n.tsx              # JA/EN 言語切り替え
  settings.tsx          # 音声・クイズ設定 (localStorage)

components/
  HomeContent.tsx       # ホーム画面 (Client Component, TutorialGuide を含む)
  TutorialGuide.tsx     # 初回チュートリアルポップアップ (localStorage で既読管理)

middleware.ts           # セッションリフレッシュ + ルート保護 + オンボーディング誘導
types/index.ts          # 全型定義
supabase/migrations/    # 001〜008 SQL (手動実行)
```

## DB スキーマ（主要カラム）
```sql
phrases:       id, user_id, phrase, meaning_ja, original_context, pronunciation,
               source_type, source_title, source_date, difficulty(1-5),
               usage_scene(daily|technical|business|other),
               engineer_level(junior|mid|senior),
               deleted_at, delete_reason(product_name|not_phrase), added_date

quiz_sessions: id, user_id, total_questions, correct_count, completed_at
quiz_answers:  session_id, phrase_id, user_answer, is_correct, ai_feedback, answered_at
import_jobs:   id, user_id, type(file|url), source_name, status, phrase_count,
               phrases(JSONB), error_text, created_at, completed_at
user_progress: id, user_id, phrase_id, is_mastered (RLS済み、Phase 4 用)
app_logs:      level, endpoint, message, detail(JSONB), created_at
```

### マイグレーション実行状況
| ファイル | 内容 | 実行方法 |
|----------|------|---------|
| 001〜003 | 初期スキーマ、app_logs | Supabase SQL Editor |
| 004 | import_jobs | Supabase SQL Editor |
| 005 | phrases に user_id + RLS | Supabase SQL Editor |
| 006 | quiz_sessions/answers に user_id + RLS | Supabase SQL Editor |
| 007 | import_jobs に user_id + RLS | Supabase SQL Editor |
| 008 | user_progress に user_id + is_mastered + RLS | Supabase SQL Editor |

## Supabase クライアント使い分け

| 用途 | 関数/ファイル | キー | 注意 |
|------|------------|------|------|
| Route Handler 認証チェック | `getUser()` (lib/auth.ts) | ANON (Cookie) | `createSupabaseServerClient` を内部使用 |
| Route Handler DB 読み書き | `getSupabaseAdmin()` (lib/supabase.ts) | SERVICE_ROLE | RLS をバイパス。必ず `.eq('user_id', user.id)` を手動フィルタ |
| Client Component 認証 | `useAuth()` (lib/auth-context.tsx) | ANON (Cookie) | `createBrowserSupabaseClient` を内部使用 |
| Client Component 直接操作 | `createBrowserSupabaseClient()` (lib/supabase-browser.ts) | ANON (Cookie) | login/page.tsx のみ使用 |
| Middleware | `createServerClient` (@supabase/ssr 直接) | ANON | セッションリフレッシュのため直接使用 |

**重要ルール:**
- Route Handler では **全テーブル** `getSupabaseAdmin()` を使い、必ず `.eq('user_id', user.id)` でフィルタする
  → `getSupabase()` (ANON key) は Route Handler では `auth.uid()` が null になりデータが0件になる
- `getSupabase()` は現在 lib/supabase.ts に残っているが Route Handler では使用しない
- `lib/supabase-server.ts` は `next/headers` を import するため Server Component / Route Handler 専用
- `lib/supabase-browser.ts` は Client Component 専用（`next/headers` を使わない）

## 認証フロー
```
/login → signUp() → 確認メール → /auth/callback → exchangeCodeForSession()
       → middleware が onboarding_complete チェック
       → 未完了なら /onboarding → アンケート保存 + シード10問 → /
       → 完了なら / → TutorialGuide ポップアップ（初回のみ）
```

### middleware.ts の挙動
1. セッション Cookie をリフレッシュ（必須）
2. PUBLIC_PATHS (`/login`, `/auth/callback`) は認証不要
3. 未認証 → `/login` へリダイレクト
4. 認証済み + `/login` → `/` へリダイレクト
5. 認証済み + `onboarding_complete` 未設定 + 非 ONBOARDING_EXEMPT パス → `/onboarding` へリダイレクト
   - ONBOARDING_EXEMPT: `/onboarding`, `/api/`, `/auth/`

## ユーザー設定（user_metadata）
Supabase の `auth.users.raw_user_meta_data` に保存:
```typescript
{
  study_purpose: 'meeting' | 'review' | 'reading' | 'interview' | 'general'
  study_level:   'beginner' | 'intermediate' | 'advanced'
  study_domain:  string | undefined  // 最大100文字のフリーワード
  onboarding_complete: true
}
```
- Route Handler から更新: `db.auth.admin.updateUserById(user.id, { user_metadata: {...} })`
- Client Component から参照: `useAuth().user?.user_metadata`

## UserContext (フレーズ抽出プロンプトへの反映)
```typescript
// lib/extract-phrases.ts
interface UserContext {
  study_purpose?: string
  study_level?: string
  study_domain?: string
}
extractPhrasesWithClaude(text, userContext?)
```
- `import-async/route.ts` の `processJob` が `db.auth.admin.getUserById(userId)` でメタデータを取得して渡す
- `study_domain` は専門領域・興味（例: データエンジニア、ワイン・料理）

## 重要パターン

### 論理削除
`phrases` に `deleted_at TIMESTAMPTZ` + `delete_reason TEXT`。
一覧・クイズ取得は必ず `.is('deleted_at', null)` を付ける。

### Upsert（save route）
同一ユーザーの同一フレーズ（大文字小文字無視）は UPDATE、新規は INSERT。
`user_id` フィルタを忘れると他ユーザーのフレーズを更新してしまうため必須。

### JSON 部分回復 (extract-phrases.ts)
Claude の max_tokens 超過で JSON 途中切断された場合の3段階フォールバック:
1. `JSON.parse()` 直接
2. 未エスケープ改行をサニタイズして再試行
3. `{` `}` のブレース数えで完結オブジェクトを個別抽出

### TutorialGuide の既読管理
`localStorage.getItem('tutorial_seen_{user.id}')` で判定。
`null` なら表示、`'1'` なら非表示。ユーザー ID をキーに含めることで複数アカウントに対応。

### Railway リバースプロキシ対応
`auth/callback/route.ts` では `request.url` が `localhost:8080` になるため、
`x-forwarded-host` / `x-forwarded-proto` ヘッダーから正しい origin を構築する。

### セキュリティ実装済み
- UUID v4 形式バリデーション (phrases/[id], jobs/[id])
- 入力長制限: phrase(200) / user_answer(500) / context(1000) / file(2MB, 200k chars) / domain(100)
- allowlist: source_type / delete_reason / study_purpose / study_level
- PostgREST インジェクション対策: `.or()` 文字列から `%_,.()*"'` をストリップ
- SSRF 対策: import URL のプライベート IP 拒否 (`isAllowedHost`)
- Security headers: X-Frame-Options, CSP, HSTS 等 (next.config.mjs)
- CSP connect-src に Supabase URL を追加（ブラウザから Auth XHR のため）

### ログ
```typescript
log({ level: 'error'|'warn'|'info', endpoint: '/api/...', message: 'code', detail: {...} })
```
console + Supabase `app_logs` テーブルに非同期書き込み (fire-and-forget)。

## 環境変数
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # 全 Route Handler の DB 操作に必要 (Railway 要設定)
ANTHROPIC_API_KEY
```

## モバイル対応の注意点
- input の `font-size` は必ず `style={{ fontSize: '16px' }}` でインライン指定 (iOS Safari 自動ズーム防止)
- `min-h-[100dvh]` は使わない — キーボード展開時に `dvh` が変わりレイアウトシフト発生
- `min-h-screen` (100vh) は iOS では keyboard 表示で変化しないので安定

## API 設計メモ
- `quiz/judge` レスポンス: `{ correct, status: 'correct'|'partial'|'incorrect', feedback, context_ja? }`
- `quiz/explain` レスポンス: `{ explanation: string }` — 語源・ニュアンス・使用場面・注意点
- `admin/import-async`: ジョブ作成後 `processJob()` を fire-and-forget で実行
- `user/onboarding` POST: アンケート保存 + フレーズ0件時のみシード10問挿入
- `stats`: 認証ユーザーの phrases 件数を返す（未認証は 0 を返す）

## PWA
- `app/manifest.ts` で PWA マニフェスト定義（Next.js 14 App Router）
- `app/icon.tsx` / `app/apple-icon.tsx` でアイコン自動生成（ImageResponse）
- **必須**: `export const runtime = 'edge'` を icon ファイルに追加
  （Node.js runtime だと Windows ビルド時に `@vercel/og` が `Invalid URL` エラー）
- manifest の `icons[].purpose` は `'any'` と `'maskable'` を別エントリに分ける

## デプロイ
```bash
git add <files> && git commit -m "..." && git push origin master
# Railway が master push を検知して自動ビルド・デプロイ
```
ビルドエラーは TypeScript 型エラーで落ちることが多い。`npm run build` でローカル確認可。

## Supabase ダッシュボード設定（本番）
- Authentication → URL Configuration → **Site URL**: Railway の本番 URL
- Authentication → URL Configuration → **Redirect URLs**: `{本番URL}/auth/callback`
- これがないとメール確認リンクが localhost を向く
