'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Image from 'next/image'

// Trusted Teal パレット（旧: 茶系ウォームベージュ）
const INK = '#16211f'
const INK_SOFT = '#5d6b66'
const MUTED = '#8a948f'
const BRAND = '#0e6e72'

const SLIDES = [
  {
    step: 1,
    image: true,
    title: 'あなたの体験から、\n英語を選び取れ。',
    sub: '実際にあなたの場の会話録が\n最高の英語教材になります。',
    cta: 'チュートリアルを始める',
  },
  {
    step: 2,
    image: false,
    icon: '📥',
    heading: 'Sourceを貼るだけ',
    title: '議事録・会議録・動画の文字起こしから、\nコピーするだけでピックが始まります。',
    sub: '',
    cta: '次へ',
  },
  {
    step: 3,
    image: false,
    icon: '🎸',
    heading: 'Pickして、練習して、使える',
    title: 'その場で聞こえていた英語が、\n今日から自分のものになります。',
    sub: '',
    cta: '最初のSourceをPickする →',
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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'linear-gradient(160deg, #f7f6f2 0%, #eef1f0 100%)' }}>

      {/* スキップ */}
      <div className="flex justify-end p-4">
        <button
          onClick={dismiss}
          className="text-sm px-3 py-1.5 rounded-full"
          style={{ color: INK_SOFT, background: 'rgba(22,33,31,0.06)' }}
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
              <h1 className="text-5xl font-bold tracking-tight" style={{ color: INK }}>
                Pick
              </h1>
              <p className="text-sm font-semibold" style={{ color: BRAND }}>会話からフレーズをピックして学ぼう</p>
            </div>

            <div className="w-56 h-56 flex items-center justify-center">
              {!imgError ? (
                <Image
                  src="/pick_logo.png"
                  alt="Pick"
                  width={224}
                  height={224}
                  className="object-contain drop-shadow-xl rounded-3xl"
                  onError={() => setImgError(true)}
                  priority
                />
              ) : (
                <span className="text-9xl select-none">🎸</span>
              )}
            </div>
          </>
        )}

        {/* スライド2・3: アイコン + 見出し */}
        {current.step !== 1 && (
          <>
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-lg"
              style={{ background: 'rgba(14,110,114,0.10)' }}
            >
              {current.icon}
            </div>
            <p className="text-xl font-bold" style={{ color: INK }}>{current.heading}</p>
          </>
        )}

        {/* テキスト */}
        <div className="space-y-2 max-w-xs">
          <p className="text-base font-semibold leading-relaxed whitespace-pre-line" style={{ color: INK }}>
            {current.title}
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: INK_SOFT }}>
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
              background: i === slide ? BRAND : 'rgba(14,110,114,0.25)',
            }}
          />
        ))}
      </div>

      {/* ステップ表示 */}
      <p className="text-center text-xs pb-2" style={{ color: MUTED }}>
        {slide + 1} / {SLIDES.length}
      </p>

      {/* CTAボタン */}
      <div className="px-8 pb-10 space-y-3">
        <button
          onClick={handleCta}
          className="w-full py-4 rounded-2xl text-base font-bold shadow-md transition-opacity active:opacity-80"
          style={{ background: BRAND, color: '#fff' }}
        >
          {current.cta}
        </button>
        {slide > 0 && (
          <button
            onClick={() => setSlide((s) => s - 1)}
            className="w-full py-2 text-sm"
            style={{ color: MUTED }}
          >
            ← 戻る
          </button>
        )}
      </div>
    </div>
  )
}
