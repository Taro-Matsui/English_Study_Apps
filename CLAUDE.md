# Engineer English App — Claude Code Guide

## 概要
エンジニア向け英語フレーズ学習アプリ。会話録テキストをアップロード → Claude が英語フレーズを抽出 → クイズで学習。

## スタック
- **Framework**: Next.js 14 App Router (TypeScript)
- **DB**: Supabase (PostgreSQL + RLS)
- **LLM**: Claude API via `fetch` (SDK は不使用 — Railway 接続問題を回避)
  - 抽出: `claude-sonnet-4-6`, max_tokens: 8192
  - 判定: `claude-haiku-4-5-20251001`, max_tokens: 300
- **UI**: Tailwind CSS + shadcn/ui (dark: `bg-slate-900`)
- **Deploy**: Railway (master ブランチ push で自動デプロイ)

## ディレクトリ構成
```
app/
  page.tsx              # ホーム (force-dynamic, Supabase直接呼び出し)
  phrases/page.tsx      # フレーズ一覧 + 論理削除
  quiz/page.tsx         # クイズ (Client Component)
  history/page.tsx      # チャレンジ記録
  admin/import/page.tsx # テキストインポート (Admin)
  api/
    phrases/route.ts          # GET: 一覧取得 (deleted_at IS NULL)
    phrases/[id]/route.ts     # PATCH: 論理削除
    quiz/route.ts             # GET: ランダム出題
    quiz/judge/route.ts       # POST: AI判定 → status: correct|partial|incorrect
    quiz/complete/route.ts    # POST: セッション保存
    admin/import/route.ts     # POST: テキスト → Claude抽出
    admin/save/route.ts       # POST: フレーズDB登録
    admin/logs/route.ts       # GET: ログ参照
    history/route.ts          # GET: クイズ履歴
    stats/route.ts            # GET: phrase_count, source_count
lib/
  supabase.ts           # getSupabase() / getSupabaseAdmin()
  extract-phrases.ts    # Claude API呼び出し + JSON部分回復
  logger.ts             # 構造化ログ (console + app_logs テーブル)
  parse-transcript.ts   # テキスト前処理
types/index.ts          # 全型定義
supabase/migrations/    # 001〜003 SQL
```

## DB スキーマ（主要カラム）
```sql
phrases:      id, phrase, meaning_ja, original_context, pronunciation,
              source_type, source_title, source_date, difficulty(1-5),
              usage_scene(daily|technical|business|other),
              engineer_level(junior|mid|senior),
              deleted_at, delete_reason(product_name|not_phrase)

quiz_sessions: id, total_questions, correct_count, completed_at, session_type
quiz_answers:  session_id, phrase_id, user_answer, is_correct, ai_feedback
app_logs:      level, endpoint, message, detail(JSONB), created_at
```
> **migrations/003_app_logs.sql** は Supabase SQL Editor で手動実行が必要

## Supabase クライアント使い分け
| 用途 | 関数 | キー |
|------|------|------|
| 読み取り / 一般書き込み | `getSupabase()` | ANON_KEY |
| 管理操作 (import/save/delete) | `getSupabaseAdmin()` | SERVICE_ROLE_KEY |

**重要**: `quiz/complete` は `getSupabase()` を使う。`getSupabaseAdmin()` にすると Railway で SUPABASE_SERVICE_ROLE_KEY 未設定により silent failure になる。

## 重要パターン

### RLS
全テーブル `FOR ALL USING (true)` — 認証なし、シングルユーザー想定。

### 論理削除
`phrases` に `deleted_at TIMESTAMPTZ` + `delete_reason TEXT`。
一覧・クイズ取得は必ず `.is('deleted_at', null)` を付ける。

### JSON 部分回復 (extract-phrases.ts)
Claude の max_tokens 超過で JSON が途中切断された場合の3段階フォールバック:
1. `JSON.parse(jsonStr)` 直接
2. 未エスケープ改行をサニタイズして再試行
3. `{` `}` のブレース数えで完結オブジェクトを個別抽出

### セキュリティ実装済み
- UUID v4 形式バリデーション (phrases/[id])
- 入力長制限: phrase(200) / user_answer(500) / context(1000) / file(2MB, 200k chars)
- allowlist: source_type / delete_reason
- PostgREST インジェクション対策: `.or()` 文字列から `%_,.()*"'` をストリップ
- Security headers: X-Frame-Options, CSP, HSTS 等 (next.config.mjs)

### ログ
```typescript
log({ level: 'error'|'warn'|'info', endpoint: '/api/...', message: 'code', detail: {...} })
```
console + Supabase `app_logs` テーブルに非同期書き込み (fire-and-forget)。

## 環境変数
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY   # admin操作のみ (Railway 要設定)
ANTHROPIC_API_KEY
```

## モバイル対応の注意点
- input の `font-size` は必ず `style={{ fontSize: '16px' }}` でインライン指定 (iOS Safari 自動ズーム防止)
- `min-h-[100dvh]` は使わない — キーボード展開時に `dvh` が変わりレイアウトシフト発生
- `min-h-screen` (100vh) は iOS では keyboard 表示で変化しないので安定
- quiz/page.tsx は sticky ヘッダー + 通常フローページ。入力欄は問題カード直下に配置し、iOS キーボード展開時も問題と入力欄が同時に視野内に収まる構造

## API 設計メモ
- `quiz/judge` レスポンス: `{ correct: boolean, status: 'correct'|'partial'|'incorrect', feedback, context_ja? }`
- `admin/import`: テキスト → Claude 抽出のみ (DB 保存は /save に分離)
- `stats`: anon key で phrase_count, source_count を返す (ホーム画面用)

## PWA
- `app/manifest.ts` で PWAマニフェスト定義（Next.js 14 App Router）
- `app/icon.tsx` / `app/apple-icon.tsx` でアイコン自動生成（ImageResponse）
- **必須**: `export const runtime = 'edge'` を icon ファイルに追加すること
  （Node.js runtime だと Windows ビルド時に `@vercel/og` が `Invalid URL` エラーを起こす）
- manifest の `icons[].purpose` は `'any'` と `'maskable'` を別エントリに分ける（`'any maskable'` は型エラー）

## デプロイ
```bash
git add <files> && git commit -m "..." && git push origin master
# Railway が master push を検知して自動ビルド・デプロイ
```
ビルドエラーは TypeScript 型エラーで落ちることが多い。`npm run build` でローカル確認可。
