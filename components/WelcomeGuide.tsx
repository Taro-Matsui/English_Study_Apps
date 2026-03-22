'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Image from 'next/image'

const SLIDES = [
  {
    step: 1,
    image: true,
    title: 'あなたのリアルな会話から、\n英語のヒントを巻き上げよう。',
    sub: '準備はいいですか？',
    cta: 'チュートリアルを始める',
  },
  {
    step: 2,
    image: false,
    icon: '📥',
    heading: 'コンテキストを取り込む',
    title: '会議録・記事・字幕など\nあなたのリアルな素材を追加するだけ。',
    sub: 'AIが英語フレーズを自動で手繰り寄せます。',
    cta: '次へ',
  },
  {
    step: 3,
    image: false,
    icon: '🎣',
    heading: 'クイズで定着',
    title: '日本語訳を見て英語で答える。\nAIがフィードバックして上達をサポート。',
    sub: '毎日続けることで英語力が伸びていきます。',
    cta: 'コンテキストを追加する →',
  },
]

export function WelcomeGuide() {
  const router = useRouter()
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const [slide, setSlide] = useState(0)
  const [imgError, setImgError] = useState(false)

  const storageKey = user ? `welcome_seen_${user.id}` : null

  useEffect(() => {
    if (!storageKey) return
    if (!localStorage.getItem(storageKey)) {
      setShow(true)
    }
  }, [storageKey])

  function dismiss() {
    if (storageKey) localStorage.setItem(storageKey, '1')
    setShow(false)
  }

  function handleCta() {
    if (slide < SLIDES.length - 1) {
      setSlide((s) => s + 1)
    } else {
      dismiss()
      router.push('/library/import')
    }
  }

  if (!show) return null

  const current = SLIDES[slide]

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(160deg, #f5f0e8 0%, #e8ddd0 100%)' }}>

      {/* スキップ */}
      <div className="flex justify-end p-4">
        <button
          onClick={dismiss}
          className="text-sm px-3 py-1.5 rounded-full"
          style={{ color: '#8b7355', background: 'rgba(139,115,85,0.12)' }}
        >
          スキップ
        </button>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center space-y-6">

        {/* スライド1: ロゴ + 画像 */}
        {current.step === 1 && (
          <>
            <div className="space-y-1">
              <h1 className="text-5xl font-bold tracking-tight" style={{ color: '#4a3020', fontFamily: 'Georgia, serif' }}>
                Reel
              </h1>
              <p className="text-sm font-medium" style={{ color: '#8b6340' }}>英語を楽しく、リアルに学ぶ</p>
            </div>

            <div className="w-56 h-56 flex items-center justify-center">
              {!imgError ? (
                <Image
                  src="/logo.png"
                  alt="Reel"
                  width={224}
                  height={224}
                  className="object-contain drop-shadow-xl"
                  onError={() => setImgError(true)}
                  priority
                />
              ) : (
                <span className="text-9xl select-none">🎣</span>
              )}
            </div>
          </>
        )}

        {/* スライド2・3: アイコン + 見出し */}
        {current.step !== 1 && (
          <>
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-lg"
              style={{ background: 'rgba(139,115,85,0.15)' }}
            >
              {current.icon}
            </div>
            <p className="text-xl font-bold" style={{ color: '#4a3020' }}>{current.heading}</p>
          </>
        )}

        {/* テキスト */}
        <div className="space-y-2 max-w-xs">
          <p className="text-base font-semibold leading-relaxed whitespace-pre-line" style={{ color: '#4a3020' }}>
            {current.title}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#7a6248' }}>
            {current.sub}
          </p>
        </div>
      </div>

      {/* ドットインジケーター */}
      <div className="flex justify-center gap-2 pb-4">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === slide ? 20 : 7,
              height: 7,
              background: i === slide ? '#8b6340' : 'rgba(139,99,64,0.25)',
            }}
          />
        ))}
      </div>

      {/* ステップ表示 */}
      <p className="text-center text-xs pb-2" style={{ color: '#a08060' }}>
        {slide + 1} / {SLIDES.length}
      </p>

      {/* CTAボタン */}
      <div className="px-8 pb-10 space-y-3">
        <button
          onClick={handleCta}
          className="w-full py-4 rounded-2xl text-base font-bold shadow-md transition-opacity active:opacity-80"
          style={{ background: '#8b6340', color: '#fff' }}
        >
          {current.cta}
        </button>
        {slide > 0 && (
          <button
            onClick={() => setSlide((s) => s - 1)}
            className="w-full py-2 text-sm"
            style={{ color: '#a08060' }}
          >
            ← 戻る
          </button>
        )}
      </div>
    </div>
  )
}
