'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const STEPS = [
  {
    icon: '🎯',
    color: 'from-brand to-brand-deep',
    title: 'クイズで練習しよう',
    desc: '初期フレーズ10問がすでに登録済みです。日本語訳を見て英語で答えると、AIが採点・フィードバックしてくれます。',
  },
  {
    icon: '📚',
    color: 'from-brand to-brand-deep',
    title: 'フレーズ一覧で管理',
    desc: '登録されたフレーズを検索・確認できます。クイズで間違えたフレーズも一覧から見直せます。',
  },
  {
    icon: '⚙️',
    color: 'from-violet-500 to-violet-600',
    title: 'テキストからフレーズを自動作成',
    desc: '会議録や技術ドキュメントをアップロードすると、Claudeがエンジニア英語フレーズを自動抽出・登録します。',
  },
  {
    icon: '🎉',
    color: 'from-amber-500 to-amber-600',
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-800 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* ステップドット */}
        <div className="flex gap-1.5 pt-5 justify-center">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-brand' : i < step ? 'w-2 bg-brand/40' : 'w-2 bg-white/15'
              }`}
            />
          ))}
        </div>

        {/* アイコン */}
        <div className="flex justify-center mt-5">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center text-3xl shadow-lg`}>
            {current.icon}
          </div>
        </div>

        {/* テキスト */}
        <div className="px-6 py-5 text-center space-y-2">
          <h2 className="text-white font-bold text-lg">{current.title}</h2>
          <p className="text-slate-400 text-sm leading-relaxed">{current.desc}</p>
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
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-colors"
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
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
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
