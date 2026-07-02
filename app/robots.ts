import type { MetadataRoute } from 'next'

// 認証必須・個人データ画面はクロール禁止。公開LP・デモ・法的ページはクロール許可。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/quiz',
        '/phrases$',
        '/history',
        '/streak',
        '/settings',
        '/onboarding',
        '/library',
        '/api/',
      ],
    },
    sitemap: 'https://usepick.win/sitemap.xml',
    host: 'https://usepick.win',
  }
}
