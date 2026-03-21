import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Reel',
    short_name: 'Reel',
    description: '実際の会話・文書から英語フレーズを手繰り寄せて学ぶアプリ',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f5f0e8',
    theme_color: '#f5f0e8',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
