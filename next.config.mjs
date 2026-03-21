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
          // M2: CSP — XSS防止。Next.js App Router は inline script を使うため unsafe-inline が必要
          // unsafe-eval: GTM が動的コード評価を使用するため必要
          // connect-src: Supabase（Auth/DB）・GTM/GA4・AdSense の通信を許可
          // frame-src: GTM の noscript iframe・Google OAuth ポップアップを許可
          // frame-ancestors: X-Frame-Options: DENY と同等（CSP版）
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com",
              "script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://partner.googleadservices.com https://tpc.googlesyndication.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
              "font-src 'self' data:",
              "connect-src 'self' https://tgqfnsmrwvpycmhmfpyv.supabase.co https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://googleads.g.doubleclick.net https://ep1.adtrafficquality.google",
              "frame-src https://www.googletagmanager.com https://accounts.google.com https://tpc.googlesyndication.com https://googleads.g.doubleclick.net",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

export default nextConfig;
