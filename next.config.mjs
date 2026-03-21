/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },

  // セキュリティヘッダー (A05: Security Misconfiguration 対策)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // クリックジャッキング防止
          { key: 'X-Frame-Options', value: 'DENY' },
          // MIMEスニッフィング防止
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrerポリシー
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // XSS保護（モダンブラウザはCSPで対応するが互換性のため設定）
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          // Permissions Policy: 不要なブラウザ機能を無効化
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // HSTS: HTTPS強制（本番環境のみ有効、ローカル開発には影響なし）
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // M2: CSP — ワイルドカードで Google 系サービスを包括許可
          // *.googletagmanager.com  : GTM スクリプト・noscript iframe
          // *.google-analytics.com  : GA4 計測
          // *.googlesyndication.com : AdSense 広告配信
          // *.googleadservices.com  : Google 広告サービス
          // *.adtrafficquality.google: AdSense トラフィック品質チェック (ep1/ep2 等)
          // *.doubleclick.net       : 広告配信・iframe
          // *.google.com            : Google OAuth (accounts.google.com) 等
          // unsafe-eval             : GTM が動的コード評価を使用するため必要
          // frame-ancestors 'none'  : X-Frame-Options: DENY と同等（CSP版）
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googletagmanager.com *.google-analytics.com *.googlesyndication.com *.googleadservices.com *.adtrafficquality.google",
              "script-src-elem 'self' 'unsafe-inline' *.googletagmanager.com *.google-analytics.com *.googlesyndication.com *.googleadservices.com *.adtrafficquality.google",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: *.google-analytics.com *.googletagmanager.com *.doubleclick.net *.googlesyndication.com",
              "font-src 'self' data:",
              "connect-src 'self' https://tgqfnsmrwvpycmhmfpyv.supabase.co *.google-analytics.com *.analytics.google.com *.googletagmanager.com *.doubleclick.net *.adtrafficquality.google",
              "frame-src *.googletagmanager.com *.google.com *.doubleclick.net *.googlesyndication.com *.adtrafficquality.google",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

export default nextConfig;
