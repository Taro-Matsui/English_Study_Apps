import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getScene, LANDING_SCENE_SLUGS } from '@/lib/landing-scenes'
import { getSeedPhrases } from '@/lib/seed-phrases'
import { TrackOnMount } from '@/components/TrackOnMount'

// 全シーンをビルド時に静的生成（ISR不要・追加API費用ゼロ）
export function generateStaticParams() {
  return LANDING_SCENE_SLUGS.map((scene) => ({ scene }))
}

export function generateMetadata({ params }: { params: { scene: string } }): Metadata {
  const s = getScene(params.scene)
  if (!s) return { title: '英語フレーズ集 | Pick' }
  const path = `/phrases-for/${s.slug}`
  return {
    title: s.title,
    description: s.description,
    alternates: { canonical: path },
    openGraph: {
      title: s.title,
      description: s.description,
      url: path,
      type: 'article',
    },
  }
}

export default function ScenePhrasesPage({ params }: { params: { scene: string } }) {
  const scene = getScene(params.scene)
  if (!scene) notFound()

  const phrases = getSeedPhrases(scene.seedKey)

  // 構造化データ（ItemList）— 検索エンジンにフレーズ集の構造を伝える
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: scene.h1,
    description: scene.description,
    itemListElement: phrases.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.phrase,
      description: p.meaning_ja,
    })),
  }

  return (
    <div className="min-h-screen bg-ground py-10 px-4">
      <TrackOnMount event="lp_view" props={{ scene: scene.slug }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-2xl mx-auto space-y-8">
        {/* ヘッダー */}
        <header className="space-y-3">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
            Pick トップへ →
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-snug">{scene.h1}</h1>
          <p className="text-sm text-gray-600 leading-relaxed">{scene.intro}</p>
        </header>

        {/* フレーズ一覧 */}
        <ul className="space-y-4">
          {phrases.map((p, i) => (
            <li
              key={`${p.phrase}-${i}`}
              className="bg-white rounded-2xl border border-line shadow-sm p-5 space-y-2"
            >
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-lg font-bold text-brand">{p.phrase}</span>
                {p.pronunciation && (
                  <span className="text-xs text-gray-400">{p.pronunciation}</span>
                )}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{p.meaning_ja}</p>
              {p.original_context && (
                <p className="text-sm text-gray-500 italic border-l-2 border-brand-soft pl-3">
                  “{p.original_context}”
                </p>
              )}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <section className="bg-white rounded-2xl border border-line shadow-sm p-6 text-center space-y-3">
          <h2 className="text-lg font-bold text-gray-900">自分の会話・文書からもピックしよう</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            議事録・YouTube字幕・技術記事などを貼り付けると、AIがあなたに必要な英語フレーズを自動でピックします。
            まずは登録不要でお試しできます。
          </p>
          <Link
            href="/demo/import"
            className="inline-block w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-brand text-white text-sm font-bold hover:bg-brand-deep transition-colors"
          >
            登録不要でピックを試す
          </Link>
          <div>
            <Link href="/login" className="text-xs text-brand hover:underline">
              アカウントを作って続きを学ぶ →
            </Link>
          </div>
        </section>

        {/* フッター */}
        <div className="flex justify-center gap-6 text-xs text-gray-400 pb-6">
          <Link href="/about" className="hover:text-gray-600">
            Pick とは
          </Link>
          <Link href="/privacy" className="hover:text-gray-600">
            プライバシーポリシー
          </Link>
          <Link href="/terms" className="hover:text-gray-600">
            利用規約
          </Link>
        </div>
      </div>
    </div>
  )
}
