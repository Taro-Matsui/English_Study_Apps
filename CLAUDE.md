# Reel — Claude Code Guide

## 概要
実際の会話・文書から英語フレーズを手繰り寄せて学ぶアプリ。
テキストをアップロード → Claude がフレーズ抽出 → クイズで定着。
**マルチユーザー対応**（Supabase Auth + RLS）。

タグライン（JA）: 実際の会話からフレーズを手繰り寄せる
タグライン（EN）: Reel in the words from your real conversations.

## スタック
- **Framework**: Next.js 14 App Router (TypeScript)
- **DB**: Supabase (PostgreSQL + RLS、ユーザー別データ分離)
- **Auth**: Supabase Auth (メール+パスワード) + `@supabase/ssr` (Cookie セッション)
- **LLM**: Claude API via `fetch` (SDK 不使用 — Railway 接続問題を回避)
  - 抽出: `claude-sonnet-4-6`, max_tokens: 8192
  - 判定: `claude-haiku-4-5-20251001`, max_tokens: 300
  - 解説: `claude-haiku-4-5-20251001`, max_tokens: 600
- **UI**: Tailwind CSS + shadcn/ui
  - ライト（デフォルト）/ ダーク / システム設定 の3択テーマ切り替え
  - ライト: `bg-slate-50` / `bg-white`、ダーク: `dark:bg-gray-900` / `dark:bg-gray-800`
  - `darkMode: ["class"]` — `.dark` を `<html>` に付与して切り替え
  - FOUC 防止: `app/layout.tsx` の `<head>` 内インラインスクリプトで localStorage を先読み
- **Analytics**: `@next/third-parties/google` の `GoogleTagManager` (GTM-PWNWXD23)
- **AdSense**: `ca-pub-3375981541016037` — `<head>` に直接埋め込み（クローラー検知のため GTM 非経由）
- **Deploy**: Railway (master push → 自動デプロイ)

## ディレクトリ構成
```
app/
  page.tsx                    # ホーム (force-dynamic, user-specific stats)
  login/page.tsx              # ログイン・新規登録フォーム
  onboarding/page.tsx         # 学習アンケート（初回 + 再編集可）
  phrases/page.tsx            # フレーズ一覧 + 論理削除
  quiz/page.tsx               # クイズ (Client Component)
  history/page.tsx            # チャレンジ記録 + セッション別 X シェア
  settings/page.tsx           # 設定（音声/クイズ/テーマ/学習プロフィール）
  streak/page.tsx             # 学習カレンダー（過去6ヶ月、正解率別色分け）
                              #   統計: 現在連続日数 / 最長記録 / 総学習日数
  library/
    import/page.tsx           # テキストインポート（サンプルテキスト付き）
    jobs/page.tsx             # ジョブ一覧（アクティブジョブあり時のみ5秒ポーリング、完了後停止）
    jobs/[id]/page.tsx        # ジョブ詳細 + フレーズ保存 + クイズ導線
  admin/                      # 旧パス (redirect stub のみ、削除不可)
    import/page.tsx           # → /library/import にリダイレクト
    jobs/page.tsx             # → /library/jobs にリダイレクト
    jobs/[id]/page.tsx        # → /library/jobs/[id] にリダイレクト
  auth/callback/route.ts      # メール確認コールバック
  api/
    auth/signout/route.ts     # サインアウト
    user/onboarding/route.ts  # 学習設定保存 + シードフレーズ挿入
    phrases/route.ts          # GET: 一覧 (?q, ?difficulty=1-5, ?scene, ?source フィルタ)
                              #   Cache-Control: private, max-age=30, stale-while-revalidate=60
    phrases/[id]/route.ts     # PATCH: 論理削除 (user_id 一致チェック)
    quiz/route.ts             # POST: 出題 (mode: 'normal'|'focus', 弱点フォーカス + 即答済み降格)
    quiz/judge/route.ts       # POST: AI判定
    quiz/complete/route.ts    # POST: セッション保存 (response_time_ms を記録)
    quiz/explain/route.ts     # POST: フレーズ詳細解説 (Claude Haiku)
    admin/import-async/route.ts  # POST: 非同期インポートジョブ作成
    admin/save/route.ts          # POST: フレーズ DB 登録 (upsert)
    admin/jobs/route.ts          # GET: ジョブ一覧 (user_id フィルタ)
    admin/jobs/[id]/route.ts     # GET/PATCH: ジョブ詳細 / キャンセル
    history/route.ts             # GET: { sessions, daily_accuracy[], by_difficulty[], by_scene[] }
                                 #   Cache-Control: private, max-age=30, stale-while-revalidate=60
    history/calendar/route.ts    # GET: { activity[{ date, correct, total }] } — 過去6ヶ月
    stats/route.ts               # GET: { phrase_count, source_count, streak, today_done, weak_count }

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
  settings.tsx          # 音声・クイズ・テーマ設定 (localStorage)
                        #   voicePreset, voice, skipMastered, contextHint,
                        #   showPronunciation, colorTheme: 'light'|'dark'|'system'
  share-image.ts        # Canvas でクイズ結果シェア画像生成 (1200×630px PNG)
                        #   generateQuizResultImage(params) → Blob  ※テーマ対応
                        #   getShareText(params) → X 投稿テキスト
                        #   ShareParams: { pct, correct, total, partial, incorrect,
                        #                  theme?, studyPurpose? }
  social.ts             # X_URL 定数
  utils.ts              # cn() (Tailwind merge), formatTime(iso)

components/
  HomeContent.tsx       # ホーム画面 (Client Component)
                        #   streak 🔥 → タップで /streak カレンダーへ遷移
  ThemeProvider.tsx     # settings.colorTheme を監視し <html> に .dark を付与/除去
  TutorialGuide.tsx     # 初回チュートリアルポップアップ (localStorage で既読管理)
  BottomNav.tsx         # モバイル固定タブバー (phrases/history/library 画面のみ)

middleware.ts           # セッションリフレッシュ + ルート保護 + オンボーディング誘導
types/index.ts          # 全型定義
supabase/migrations/    # 001〜013 SQL (手動実行)
```

## DB スキーマ（主要カラム）
```sql
phrases:       id, user_id, phrase, meaning_ja, original_context, pronunciation,
               source_type, source_title, source_date, difficulty(1-5),
               usage_scene(daily|technical|business|other),
               engineer_level(junior|mid|senior),
               deleted_at, delete_reason(product_name|not_phrase), added_date,
               explanation TEXT  -- AI解説キャッシュ (migration 012)

quiz_sessions: id, user_id, total_questions, correct_count, completed_at
quiz_answers:  session_id, phrase_id, user_answer, is_correct, ai_feedback,
               answered_at, response_time_ms INT  -- 回答までの時間(ms) (migration 013)
import_jobs:   id, user_id, type(file|url), source_name, status, phrase_count,
               phrases(JSONB), error_text, created_at, completed_at
user_progress: id, user_id, phrase_id, is_mastered (RLS済み)
app_logs:      level, endpoint, message, detail(JSONB), created_at
```

### マイグレーション実行状況
| ファイル | 内容 | 状態 |
|----------|------|------|
| 001〜003 | 初期スキーマ、app_logs | 実行済み |
| 004 | import_jobs | 実行済み |
| 005 | phrases に user_id + RLS | 実行済み |
| 006 | quiz_sessions/answers に user_id + RLS | 実行済み |
| 007 | import_jobs に user_id + RLS | 実行済み |
| 008 | user_progress に user_id + is_mastered + RLS | 実行済み |
| 009 | indexes_and_fk — パフォーマンスインデックス | 実行済み |
| 010 | app_logs_ttl — ログ自動削除ポリシー | 実行済み |
| 011 | rate_limits — `api_rate_limits` + `check_and_increment_rate_limit()` | 実行済み |
| 012 | phrase_explanation — `phrases.explanation TEXT` | 実行済み |
| 013 | response_time — `quiz_answers.response_time_ms INT` + インデックス | **手動実行が必要** |

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

## 認証フロー
```
/login → signUp() → 確認メール → /auth/callback → exchangeCodeForSession()
       → middleware が onboarding_complete チェック
       → 未完了なら /onboarding → アンケート保存 + シード10問 → /
       → 完了なら / → TutorialGuide ポップアップ（初回のみ）
```

## ユーザー設定（user_metadata）
```typescript
{
  study_purpose: 'meeting' | 'review' | 'reading' | 'interview' | 'general'
  study_level:   'beginner' | 'intermediate' | 'advanced'
  study_domain:  string | undefined  // 最大100文字のフリーワード
  onboarding_complete: true
}
```

## クイズ仕様

### 出題ロジック (quiz/route.ts)
- `mode=normal`: 通常出題。即答済みフレーズ（直近10セッションで3回以上 <3500ms で正解）を末尾に降格
- `mode=focus`: 直近5セッションで2回以上不正解のフレーズを優先出題（不足時は normal にフォールバック）

### レスポンスタイム計測
- 問題表示時に `Date.now()` をセット → 回答送信時に差分を `response_time_ms` として記録
- `quiz_answers.response_time_ms` に保存（migration 013 が必要）

## X シェア機能

### 動作フロー（quiz完了時 / 記録ページ各セッション）
1. Canvas API で 1200×630px PNG を生成（ユーザーのテーマ設定に合わせた配色）
2. PNG を自動ダウンロード (`reel-result.png`)
3. X 投稿画面を直接オープン（Web Share API / 共有ダイアログなし）

### 投稿テキスト形式
```
【Reel】クイズ完了 📊
{pct}% 正解（{correct}/{total}問）

Reel — 実際の会話から学ぶ英語フレーズ
{appUrl}

#英語学習 #フレーズ学習 #{study_purposeラベル}
```

### study_purpose → ハッシュタグ対応
| 値 | ハッシュタグ |
|----|------------|
| meeting | #ミーティング英語 |
| review | #コードレビュー英語 |
| reading | #技術文書英語 |
| interview | #面接英語 |
| general | #ビジネス英語 |

### シェア画像テーマ
- `settings.colorTheme === 'light'`: 白ベースグラデーション背景
- `settings.colorTheme === 'dark'` / `system` でダーク判定: slate-900 ベースグラデーション
- スコアカラー: ≥80% emerald / ≥60% amber / <60% red

## 学習カレンダー (`/streak`)
- ホーム画面の 🔥 連続日数バッジをタップで遷移
- 過去6ヶ月分のカレンダー（月別グリッド、正解率で色分け）
- `computeStreaks()` はクライアント側で計算（サーバー側の streak 計算と独立した実装）

## 重要パターン

### 論理削除
`phrases.deleted_at TIMESTAMPTZ`。一覧・クイズ取得は必ず `.is('deleted_at', null)` を付ける。

### Upsert（save route）
同一ユーザーの同一フレーズ（大文字小文字無視）は UPDATE、新規は INSERT。`user_id` フィルタ必須。

### JSON 部分回復 (extract-phrases.ts)
Claude の max_tokens 超過で JSON 途中切断された場合の3段階フォールバック:
1. `JSON.parse()` 直接
2. 未エスケープ改行をサニタイズして再試行
3. `{` `}` のブレース数えで完結オブジェクトを個別抽出

### Railway リバースプロキシ対応
`auth/callback/route.ts` では `request.url` が `localhost:8080` になるため、
`x-forwarded-host` / `x-forwarded-proto` ヘッダーから正しい origin を構築する。

### セキュリティ
- UUID v4 形式バリデーション (phrases/[id], jobs/[id])
- 入力長制限: phrase(200) / user_answer(500) / context(1000) / file(2MB, 200k chars) / domain(100)
- allowlist: source_type / delete_reason / study_purpose / study_level
- PostgREST インジェクション対策: `.or()` 文字列から `%_,.()*"'` をストリップ
- SSRF 対策: import URL のプライベート IP 拒否 (`isAllowedHost`)
- Security headers: X-Frame-Options, CSP, HSTS 等 (next.config.mjs)

## 環境変数
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # 全 Route Handler の DB 操作に必要 (Railway 要設定)
ANTHROPIC_API_KEY
```

## モバイル対応
- input の `font-size` は必ず `style={{ fontSize: '16px' }}` でインライン指定 (iOS Safari 自動ズーム防止)
- `min-h-[100dvh]` は使わない — キーボード展開時にレイアウトシフト発生
- `min-h-screen` (100vh) を使用
- 戻るボタン: `text-2xl p-2 -ml-2` で統一（約40px タップ領域）

## PWA
- `app/manifest.ts` — name: "Reel", short_name: "Reel"
- `app/icon.tsx` / `app/apple-icon.tsx` でアイコン自動生成
- icon ファイルに `export const runtime = 'edge'` 必須（Windows ビルドで `@vercel/og` が Invalid URL エラー）

## デプロイ
```bash
git add <files> && git commit -m "..." && git push origin master
# Railway が master push を検知して自動ビルド・デプロイ
```
ビルドエラーは TypeScript 型エラーで落ちることが多い。`npm run build` でローカル確認可。

## Supabase ダッシュボード設定（本番）
- Authentication → URL Configuration → **Site URL**: Railway の本番 URL
- Authentication → URL Configuration → **Redirect URLs**: `{本番URL}/auth/callback`
