import type { MetadataRoute } from 'next'
import { LANDING_SCENE_SLUGS } from '@/lib/landing-scenes'

const BASE = 'https://usepick.win'

// 公開ページ（未ログインでクロール・閲覧可能なもの）のみ列挙。
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ['/', '/login', '/about', '/privacy', '/terms', '/contact']
  const scenePaths = LANDING_SCENE_SLUGS.map((slug) => `/phrases-for/${slug}`)

  return [...staticPaths, ...scenePaths].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path.startsWith('/phrases-for') ? 'monthly' : 'weekly',
    priority: path === '/' ? 1 : path.startsWith('/phrases-for') ? 0.8 : 0.5,
  }))
}
