import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pick',
    short_name: 'Pick',
    description: '実際の会話・文書から英語フレーズをPickして学ぶアプリ',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f7f6f2',
    theme_color: '#f7f6f2',
    icons: [
      { src: '/pick_logo.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
      { src: '/pick_logo.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
      { src: '/pick_logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pick_logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
