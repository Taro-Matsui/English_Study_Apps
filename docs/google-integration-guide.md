# Google サービス統合 設定手順書

> 対象: Next.js App Router + Railway デプロイ環境
> 対象サービス: GTM / GA4 / Google Ads / AdSense / Google OAuth

---

## 全体構成

```
GTM（タグ管理コンテナ）
  ├── GA4（サイト計測）              ← GTM 経由で配信 OK
  └── Google Ads リマーケティング    ← GTM 経由で配信 OK

AdSense（広告収益）                  ← GTM 経由 NG → <head> 直接埋め込み必須
Google OAuth（ログイン）             ← Supabase Auth 経由で実装
```

---

## Part 1 — Google アカウント設定

### 1-1. Google アカウントと各プロダクトの紐付け

| プロダクト | URL | 紐付けアカウント |
|---|---|---|
| Google Tag Manager | tagmanager.google.com | 管理者 Google アカウント |
| Google Analytics 4 | analytics.google.com | 同上 |
| Google Ads | ads.google.com | 同上（請求情報が必要） |
| Google AdSense | adsense.google.com | 同上（審査が必要） |
| Google Cloud Console | console.cloud.google.com | OAuth 用プロジェクト管理 |

同一 Google アカウントで全サービスを管理すると連携がスムーズ。

---

### 1-2. GTM アカウント・コンテナ作成

1. [tagmanager.google.com](https://tagmanager.google.com) にアクセス
2. **アカウントを作成** → アカウント名（会社名・プロジェクト名）を入力
3. **コンテナを作成** → コンテナ名（ドメイン名）・ターゲットプラットフォーム: `ウェブ`
4. 利用規約に同意 → **GTM-XXXXXXX** 形式のコンテナ ID を取得
5. 表示されるコードスニペットは **Next.js 実装では不要**（後述）

---

### 1-3. GA4 プロパティ作成

1. [analytics.google.com](https://analytics.google.com) にアクセス
2. **管理（⚙）→ プロパティを作成**
3. プロパティ名・タイムゾーン（日本）・通貨（JPY）を設定
4. ビジネス詳細を入力 → プロパティ作成
5. データストリームを追加 → **ウェブ** → URL・ストリーム名を入力
6. **測定 ID（G-XXXXXXXXXX）** を取得（GTM タグ設定で使用）

---

### 1-4. Google Ads アカウント作成

1. [ads.google.com](https://ads.google.com) にアクセス → アカウント作成
2. **ツール → コンバージョン** でコンバージョンアクションを作成
3. **コンバージョン ID（AW-XXXXXXXXX）** と **コンバージョンラベル** を取得
4. リマーケティング用に **オーディエンス → ウェブサイト訪問者** を作成

---

### 1-5. AdSense アカウント作成・審査

1. [adsense.google.com](https://adsense.google.com) にアクセス
2. **サイトの追加** → ドメイン（例: `englishstudyapps-production.up.railway.app`）を入力
3. 確認コード（`ca-pub-XXXXXXXXXXXXXXXX`）を取得
4. コードをサイトの `<head>` に **直接埋め込み**（GTM 経由は不可 → [Part 3](#part-3--adsense-の実装head-直接埋め込み) 参照）
5. Railway にデプロイ → AdSense ダッシュボードで「確認」をクリック
6. 審査期間: 数日〜2週間。審査通過後に広告フォーマットを設定

> **注意:** AdSense はコンテンツポリシー審査あり。コンテンツが薄い / 未完成の段階では否認されやすい。

---

### 1-6. Google Cloud Console — OAuth クライアント設定

Google ログイン機能を実装する場合に必要。

1. [console.cloud.google.com](https://console.cloud.google.com) にアクセス
2. **プロジェクトを作成**（または既存を選択）
3. **API とサービス → OAuth 同意画面**
   - ユーザーの種類: `外部`
   - アプリ名・サポートメール・デベロッパー連絡先を入力
   - スコープ: `email`, `profile`, `openid` を追加
   - テストユーザー: 開発中は使用するアカウントを追加
4. **API とサービス → 認証情報 → 認証情報を作成 → OAuth クライアント ID**
   - アプリケーションの種類: `ウェブアプリケーション`
   - 承認済みのリダイレクト URI に以下を追加:
     ```
     https://{本番ドメイン}/auth/callback
     http://localhost:3000/auth/callback
     ```
5. **クライアント ID** と **クライアントシークレット** を取得

6. **Supabase ダッシュボード** で設定:
   - Authentication → Providers → Google → Enable
   - Client ID / Client Secret を貼り付けて保存

---

## Part 2 — GTM の Next.js 実装

### 2-1. パッケージインストール

```bash
npm install @next/third-parties
```

### 2-2. layout.tsx への組み込み

```tsx
// app/layout.tsx
import { GoogleTagManager } from '@next/third-parties/google'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
      <GoogleTagManager gtmId="GTM-XXXXXXX" />  {/* </body> の直後・</html> の前 */}
    </html>
  )
}
```

**このコンポーネントが自動挿入するもの:**
- `<head>` 内の GTM `<script>` タグ
- `<body>` 直後の GTM `<noscript>` フォールバック

手動での `dangerouslySetInnerHTML` は不要。

---

### 2-3. GTM で GA4 タグを設定

GTM ダッシュボード（コード変更なし）:

1. **タグ → 新規**
2. タグの種類: `Google アナリティクス: GA4 設定`
3. 測定 ID: `G-XXXXXXXXXX`
4. トリガー: `All Pages`（初期化 - All Pages）
5. **保存 → 送信（公開）**

### 2-4. GTM で Google Ads リマーケティングタグを設定

1. **タグ → 新規**
2. タグの種類: `Google 広告のリマーケティング`
3. コンバージョン ID: `AW-XXXXXXXXX`
4. トリガー: `All Pages`
5. **保存 → 送信（公開）**

### 2-5. 動作確認

- Chrome 拡張 **Tag Assistant** をインストール
- サイトにアクセス → GTM / GA4 タグが `Fired` になっていること
- GA4 → リアルタイム → 自分のアクセスが計測されること

---

## Part 3 — AdSense の実装（`<head>` 直接埋め込み）

> GTM 経由は不可。AdSense クローラーは JS を実行しないため、GTM 配信のスクリプトを検知できない。

```tsx
// app/layout.tsx の <head> 内
<head>
  <script
    async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
    crossOrigin="anonymous"
  />
</head>
```

---

## Part 4 — Google OAuth の実装（Supabase Auth 経由）

```tsx
// app/login/page.tsx
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'

async function handleGoogleSignIn() {
  const supabase = createBrowserSupabaseClient()
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${location.origin}/auth/callback` },
  })
  // 成功時は自動リダイレクト。エラー時のみ catch
}
```

既存の `app/auth/callback/route.ts` の `exchangeCodeForSession` が OAuth の code も処理できるため、コールバックルートの追加変更は不要。

---

## Part 5 — CSP 設定（next.config.mjs）

Google 系サービスはサブドメインが動的（`ep1`, `ep2` ... など）のため、ワイルドカードで包括指定する。

```js
// next.config.mjs
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",

    // GTM の動的コード評価のため 'unsafe-eval' 必須
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googletagmanager.com *.google-analytics.com *.googlesyndication.com *.googleadservices.com *.adtrafficquality.google",

    "script-src-elem 'self' 'unsafe-inline' *.googletagmanager.com *.google-analytics.com *.googlesyndication.com *.googleadservices.com *.adtrafficquality.google",

    "style-src 'self' 'unsafe-inline'",

    // トラッキングピクセル
    "img-src 'self' data: blob: *.google-analytics.com *.googletagmanager.com *.doubleclick.net *.googlesyndication.com",

    "font-src 'self' data:",

    // GA4 Beacon・広告品質チェック通信
    "connect-src 'self' {SUPABASE_URL} *.google-analytics.com *.analytics.google.com *.googletagmanager.com *.doubleclick.net *.adtrafficquality.google",

    // 広告 iframe・GTM noscript・Google OAuth ポップアップ
    "frame-src *.googletagmanager.com *.google.com *.doubleclick.net *.googlesyndication.com *.adtrafficquality.google",

    "frame-ancestors 'none'",
  ].join('; '),
}
```

### ディレクティブ対応表

| ドメイン | 用途 | 必要なディレクティブ |
|---|---|---|
| `*.googletagmanager.com` | GTM スクリプト・noscript iframe | script-src, script-src-elem, frame-src, connect-src, img-src |
| `*.googlesyndication.com` | AdSense 広告配信 | script-src, script-src-elem, frame-src, img-src |
| `*.googleadservices.com` | Google 広告サービス | script-src, script-src-elem |
| `*.adtrafficquality.google` | 広告トラフィック品質チェック（ep1/ep2 等） | script-src, script-src-elem, connect-src, frame-src |
| `*.doubleclick.net` | 広告 iframe・クリック計測 | frame-src, connect-src, img-src |
| `*.google.com` | Google OAuth (accounts.google.com) | frame-src |
| `*.google-analytics.com` | GA4 計測 | script-src, connect-src, img-src |

---

## Part 6 — よくあるエラーと対処

| エラー | 原因 | 対処 |
|---|---|---|
| DevTools: `script-src-elem` blocked | `*.adtrafficquality.google` 未設定 | script-src-elem にワイルドカード追加 |
| DevTools: `connect-src` blocked | `*.adtrafficquality.google` 未設定 | connect-src に追加 |
| AdSense「サイトを確認できません」 | GTM 経由でスクリプト配信 | `<head>` に直接埋め込む |
| Quirks Mode 警告（DevTools Issues） | doubleclick.net 広告 iframe が DOCTYPE なし | 第三者コンテンツのため修正不可・無視でよい |
| GTM が動作しない（GA4 未計測） | CSP に `'unsafe-eval'` がない | script-src に `'unsafe-eval'` を追加 |
| Google ログイン後に `/` に戻れない | Supabase Redirect URLs 未設定 | Supabase → Auth → URL Configuration に本番 URL を追加 |
| Google ログイン画面が出ない | OAuth 同意画面が未公開 | GCP Console → OAuth 同意画面 → アプリを公開 |

---

## Part 7 — Supabase ダッシュボード設定チェックリスト

| 設定箇所 | 設定値 |
|---|---|
| Authentication → URL Configuration → Site URL | `https://{本番ドメイン}` |
| Authentication → URL Configuration → Redirect URLs | `https://{本番ドメイン}/auth/callback` |
| Authentication → Providers → Google → Client ID | GCP Console で取得した値 |
| Authentication → Providers → Google → Client Secret | GCP Console で取得した値 |

---

## Part 8 — このプロジェクトの設定済み値

| 項目 | 値 |
|---|---|
| GTM コンテナ ID | `GTM-PWNWXD23` |
| AdSense Publisher ID | `ca-pub-3375981541016037` |
| Google OAuth Client ID | `380306037102-7rvk50jkrhg30i0k5nop41e6ll6bm104.apps.googleusercontent.com` |
| Supabase プロジェクト URL | `https://tgqfnsmrwvpycmhmfpyv.supabase.co` |
| 本番ドメイン | `https://englishstudyapps-production.up.railway.app` |
| CSP 設定ファイル | `next.config.mjs` |
