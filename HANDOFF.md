# Engineer English App — 引き継ぎドキュメント

作成日: 2026-03-20

---

## プロジェクト概要

エンジニア向け英語フレーズ学習アプリ。

**フロー:** 会話録・技術ドキュメントをアップロード → Claude がフレーズ自動抽出 → クイズで学習

**本番 URL:** `https://englishstudyapps-production.up.railway.app`
**リポジトリ:** `https://github.com/Taro-Matsui/English_Study_Apps`
**デプロイ:** Railway (master push → 自動)

### スタック
- Next.js 14 App Router (TypeScript) + Tailwind CSS
- Supabase (PostgreSQL + Auth + RLS) + `@supabase/ssr`
- Claude API via `fetch` (SDK 不使用)
- Railway デプロイ、PWA 対応

---

## 完了済みタスク（このセッション）

### Phase 1-3: マルチユーザー対応
- [x] `@supabase/ssr` インストール、Cookie ベースセッション管理
- [x] `lib/supabase-server.ts` / `lib/supabase-browser.ts` 分離（Server/Client 境界対応）
- [x] `lib/auth.ts` — `getUser()` Route Handler 用認証
- [x] `lib/auth-context.tsx` — `UserProvider` / `useAuth()` Client Component 用
- [x] `app/login/page.tsx` — メール+パスワード サインイン/サインアップ
- [x] `app/auth/callback/route.ts` — メール確認コールバック（Railway リバースプロキシ対応済み）
- [x] `app/api/auth/signout/route.ts`
- [x] `middleware.ts` — セッションリフレッシュ + ルート保護 + オンボーディング誘導
- [x] 全 Route Handler を `getSupabaseAdmin()` + `.eq('user_id', user.id)` に統一
- [x] DB マイグレーション SQL 005〜008 作成（手動実行要）

### オンボーディング・チュートリアル
- [x] `app/onboarding/page.tsx` — 学習アンケート（初回 + 再編集対応）
- [x] `app/api/user/onboarding/route.ts` — 設定保存 + シードフレーズ10問自動挿入
- [x] `components/TutorialGuide.tsx` — 4ステップチュートリアルポップアップ（localStorage で既読管理）
- [x] 設定ページに「学習プロフィール」セクション追加（変更ボタンで `/onboarding` へ）

### 学習設定の Claude プロンプト反映
- [x] `study_purpose` (5択) → フレーズ抽出優先方針をプロンプトに追加
- [x] `study_level` (3択) → 難易度レンジをプロンプトに追加
- [x] `study_domain` (フリーワード、最大100文字) → 専門領域をプロンプトに追加
  - プリセットチップ: データエンジニア / データサイエンティスト / フロントエンド / バックエンド / セキュリティ / ビジネス / ワイン・料理
- [x] import-async の `processJob()` でユーザーメタデータを取得してプロンプトに渡す

### その他の機能修正
- [x] クイズ完了後のホーム/履歴ボタン修正（`router.push()` に変更）
- [x] フレーズ登録 upsert 対応（同一フレーズは UPDATE、新規は INSERT）
- [x] クイズ結果画面「💡 詳しく解説」ボタン（Claude Haiku による語源・ニュアンス解説）
- [x] カタカナ発音表記（IPA → ネイティブ風カタカナに変更）
- [x] 確認メール再送ボタン（サインアップ後に表示）
- [x] 未確認メールで再登録しようとした場合の自動再送
- [x] Railway リバースプロキシ対応（`x-forwarded-host` から正しい origin 取得）
- [x] stats ルートの RLS バグ修正（フレーズ件数が常に0になっていた問題）
- [x] CLAUDE.md 全面更新（現在のアーキテクチャを完全反映）

---

## 未解決の問題・バグ

### 高優先度
1. **DB マイグレーション 005〜008 未実行**
   - `supabase/migrations/005_user_phrases.sql` ～ `008_user_progress_rls.sql`
   - **Supabase SQL Editor で手動実行が必要**
   - 未実行の場合: フレーズ・クイズ・ジョブが全ユーザーで共有状態（RLS なし）
   - 実行順序: 005 → 006 → 007 → 008

2. **Supabase ダッシュボード URL 設定**
   - Authentication → URL Configuration
   - **Site URL** を `https://englishstudyapps-production.up.railway.app` に設定
   - **Redirect URLs** に `https://englishstudyapps-production.up.railway.app/auth/callback` を追加
   - 未設定の場合: メール確認リンクが誤った URL を向く可能性あり

### 中優先度
3. **Phase 4 未実装: masteredIds の DB 同期**
   - 現在: `localStorage` のみ（デバイスをまたいで引き継がれない）
   - 計画: `app/api/user/progress/route.ts` (GET/POST/DELETE) 作成
   - 計画: `lib/settings.tsx` の `markMastered`/`clearMastered` に DB 同期を追加
   - `supabase/migrations/008_user_progress_rls.sql` は既に作成済み

4. **既存データ（マイグレーション前）の取り扱い**
   - 005〜007 実行後、`user_id = NULL` のレコードは RLS で見えなくなる（事実上削除扱い）
   - 移行前のデータをどのユーザーに割り当てるか、または削除するかの判断が必要

### 低優先度
5. **メールアドレス確認の強制**
   - Supabase デフォルトでは確認前もサインインできる設定の場合がある
   - Authentication → Email → 「Confirm email」が有効か確認推奨

---

## 次に実施すべき作業（優先順）

### 今すぐ（デプロイ済みコードを動かすため）
1. Supabase SQL Editor で migration 005〜008 を順番に実行
2. Supabase ダッシュボードの Site URL / Redirect URLs を設定
3. Railway の環境変数 `SUPABASE_SERVICE_ROLE_KEY` が設定済みか確認

### 次の開発タスク
4. **Phase 4: masteredIds DB 同期**
   ```
   - app/api/user/progress/route.ts 作成 (GET/POST/DELETE)
   - lib/settings.tsx の markMastered/clearMastered に fire-and-forget DB sync 追加
   - マウント時: GET /api/user/progress → localStorage とマージ（DBを正とする）
   ```

5. **ログアウトボタンの UI 追加**
   - 現在 `/api/auth/signout` は実装済みだがホーム画面にボタンがない
   - 設定ページか HomeContent フッターに追加推奨

6. **管理者向け機能の整理**
   - `/admin/import` / `/admin/jobs` は全認証ユーザーがアクセス可能
   - 特定ユーザーのみに制限する場合は `admin` ロールの追加が必要

---

## 重要な設計上の決定事項

### Supabase クライアント使い分けルール（最重要）
```
Route Handler の DB 操作: getSupabaseAdmin() のみ使用
  → getSupabase() (ANON key) は Route Handler では auth.uid() が null になりデータ0件になる
  → 必ず .eq('user_id', user.id) を手動でフィルタする（RLS をバイパスするため）

Server Component / Route Handler の認証: getUser() (lib/auth.ts)
Client Component の認証: useAuth() (lib/auth-context.tsx)
Client Component の Supabase 操作: createBrowserSupabaseClient() (lib/supabase-browser.ts)
```

### フレーズ所有モデル
- **ユーザー別プライベートライブラリ**（ユーザー A のフレーズはユーザー B に見えない）
- インポートしたユーザーのフレーズが、そのユーザーのクイズにのみ出題される

### 非同期インポートの設計
- `processJob(jobId, text)` は HTTP レスポンス後に fire-and-forget で実行
- ユーザー設定は jobId から `import_jobs.user_id` を辿り `auth.admin.getUserById()` で取得
- フレーズ保存は別ルート `/api/admin/save` で行う（processJob はフレーズ抽出のみ）

### オンボーディングの状態管理
- `onboarding_complete: true` を `user_metadata` に保存
- middleware が全リクエストでチェックし、未完了なら `/onboarding` へリダイレクト
- API ルート (`/api/`) と `/onboarding` 自体はリダイレクト対象外

### Railway 固有の注意点
- `request.url` が `localhost:8080` になる → `auth/callback` では `x-forwarded-host` を使用
- Claude API は SDK 不使用（Railway での接続問題を回避するため `fetch` 直接呼び出し）
- `SUPABASE_SERVICE_ROLE_KEY` は Railway の環境変数に明示的に設定が必要

### PWA 固有の注意点
- `app/icon.tsx` / `app/apple-icon.tsx` に `export const runtime = 'edge'` 必須
- quiz 完了画面のナビゲーションは `<Link>` ではなく `router.push()` を使用（PWA では Link が動作しない場合がある）

---

## ファイル構成（主要変更ファイル一覧）

```
新規作成:
  lib/supabase-server.ts
  lib/supabase-browser.ts
  lib/auth.ts
  lib/auth-context.tsx
  middleware.ts
  app/login/page.tsx
  app/auth/callback/route.ts
  app/api/auth/signout/route.ts
  app/onboarding/page.tsx
  app/api/user/onboarding/route.ts
  app/api/quiz/explain/route.ts
  components/TutorialGuide.tsx
  supabase/migrations/005〜008_*.sql

主要変更:
  lib/extract-phrases.ts      — UserContext (purpose/level/domain) 追加
  app/page.tsx                — getSupabaseAdmin() + user フィルタ
  app/api/stats/route.ts      — 同上
  app/api/*/route.ts (全般)   — getSupabaseAdmin() + getUser() に統一
  app/settings/page.tsx       — 学習プロフィールセクション追加
  components/HomeContent.tsx  — TutorialGuide 追加
  next.config.mjs             — CSP connect-src に Supabase URL 追加
  CLAUDE.md                   — 全面更新
```
