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
        ],
      },
    ]
  },
};

export default nextConfig;
