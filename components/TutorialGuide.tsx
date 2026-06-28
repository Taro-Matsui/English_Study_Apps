'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const STEPS = [
  {
    icon: '🎯',
    title: 'クイズで練習しよう',
    desc: '初期フレーズ10問がすでに登録済みです。英語フレーズを見て日本語の意味を答えると、AIが採点・フィードバックしてくれます。',
  },
  {
    icon: '📚',
    title: 'フレーズ一覧で管理',
    desc: '登録されたフレーズを検索・確認できます。クイズで間違えたフレーズも一覧から見直せます。',
  },
  {
    icon: '🎸',
    title: 'テキストからフレーズを自動作成',
    desc: '会議録や技術ドキュメントを貼り付けると、Claudeが使える英語フレーズを自動抽出・登録します。',
  },
  {
    icon: '🎉',
    title: '準備完了！',
    desc: 'アンケートの学習設定は、設定ページからいつでも変更できます。まずはクイズを試してみましょう！',
  },
]

export function TutorialGuide() {
  const { user } = useAuth()
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [step, setStep] = useState(0)

  const storageKey = user ? `tutorial_seen_${user.id}` : null

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

  function handleStart() {
    dismiss()
    router.push('/quiz')
  }

  if (!show) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1
  const isFirst = step === 0

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-line rounded-2xl shadow-xl overflow-hidden">

        {/* ステップドット */}
        <div className="flex gap-1.5 pt-5 justify-center">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-brand' : i < step ? 'w-2 bg-brand/40' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* アイコン */}
        <div className="flex justify-center mt-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-brand-deep flex items-center justify-center text-3xl shadow-md">
            {current.icon}
          </div>
        </div>

        {/* テキスト */}
        <div className="px-6 py-5 text-center space-y-2">
          <h2 className="text-gray-900 font-bold text-lg">{current.title}</h2>
          <p className="text-gray-500 text-sm leading-relaxed">{current.desc}</p>
        </div>

        {/* ボタンエリア */}
        <div className="px-6 pb-6 space-y-2">
          {isLast ? (
            <button
              onClick={handleStart}
              className="w-full py-3 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-deep transition-colors"
            >
              クイズを始める 🎯
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={dismiss}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
              >
                スキップ
              </button>
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-deep transition-colors"
              >
                次へ →
              </button>
            </div>
          )}
          {!isLast && (
            <div className="flex justify-center">
              {!isFirst && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ← 戻る
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
