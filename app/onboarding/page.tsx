'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type StudyPurpose = 'meeting' | 'review' | 'reading' | 'interview' | 'general'
type StudyLevel = 'beginner' | 'intermediate' | 'advanced'

const PURPOSES: { value: StudyPurpose; icon: string; label: string; desc: string }[] = [
  { value: 'meeting',   icon: '💬', label: 'ミーティング・日常会話',        desc: 'チームとのやり取りやスタンドアップで使う表現' },
  { value: 'review',    icon: '👨‍💻', label: 'コードレビュー・Slack',        desc: 'レビューコメントやSlackで使う技術的表現' },
  { value: 'reading',   icon: '📚', label: '技術ドキュメント読解',           desc: '英語のドキュメントや論文をスムーズに読む' },
  { value: 'interview', icon: '🎤', label: '採用面接・プレゼン',             desc: 'フォーマルな場で使えるビジネス英語' },
  { value: 'general',   icon: '🌐', label: '総合的に学びたい',               desc: 'バランスよくエンジニア英語全般を習得' },
]

const LEVELS: { value: StudyLevel; label: string; desc: string }[] = [
  { value: 'beginner',     label: '初級',   desc: '英語をほぼ使ったことがない。単語は分かるが文章は難しい' },
  { value: 'intermediate', label: '中級',   desc: '読める・聞けるが、会話や文章で使いこなすのが難しい' },
  { value: 'advanced',     label: '上級',   desc: 'ある程度使えるが、よりビジネス・技術英語を洗練させたい' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [purpose, setPurpose] = useState<StudyPurpose | null>(null)
  const [level, setLevel] = useState<StudyLevel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!purpose || !level) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ study_purpose: purpose, study_level: level }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? '設定の保存に失敗しました')
        setLoading(false)
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('ネットワークエラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">

        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <p className="text-4xl">🧑‍💻</p>
          <h1 className="text-xl font-bold">Engineer English へようこそ</h1>
          <p className="text-slate-400 text-sm">あなたの学習スタイルを教えてください。<br />フレーズ抽出や出題をカスタマイズします。</p>
        </div>

        {/* 学習目的 */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">英語を使う主な目的は？</h2>
          <div className="space-y-2">
            {PURPOSES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPurpose(p.value)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                  purpose === p.value
                    ? 'border-blue-500 bg-blue-500/15'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{p.icon}</span>
                <div>
                  <p className={`text-sm font-medium ${purpose === p.value ? 'text-blue-300' : 'text-white'}`}>
                    {p.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                </div>
                {purpose === p.value && (
                  <span className="ml-auto text-blue-400 flex-shrink-0">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 英語レベル */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">現在の英語レベルは？</h2>
          <div className="flex gap-2">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLevel(l.value)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-center transition-colors ${
                  level === l.value
                    ? 'border-blue-500 bg-blue-500/15'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className={`text-sm font-bold ${level === l.value ? 'text-blue-300' : 'text-white'}`}>
                  {l.label}
                </span>
                <span className="text-xs text-slate-500 leading-tight">{l.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!purpose || !level || loading}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? '設定中...' : 'はじめる →'}
        </button>

        <p className="text-center text-xs text-slate-600">
          設定はあとから変更できます
        </p>
      </div>
    </div>
  )
}
