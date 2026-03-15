'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { JudgeResponse } from '../api/quiz/judge/route'

interface QuizPhrase {
  id: string
  phrase: string
  pronunciation: string | null
  meaning_ja: string | null
  original_context: string | null
  difficulty: number
  source_title: string | null
}

type Step = 'loading' | 'question' | 'judging' | 'result' | 'done' | 'empty'

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

const DIFF_COLOR: Record<number, string> = {
  1: 'text-emerald-500', 2: 'text-sky-500', 3: 'text-amber-500', 4: 'text-orange-500', 5: 'text-red-500',
}

export default function QuizPage() {
  const [phrases, setPhrases] = useState<QuizPhrase[]>([])
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<Step>('loading')
  const [score, setScore] = useState({ correct: 0, incorrect: 0 })
  const [answer, setAnswer] = useState('')
  const [judgment, setJudgment] = useState<JudgeResponse | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setStep('loading')
    try {
      const res = await fetch('/api/quiz?limit=10')
      const data: QuizPhrase[] = await res.json()
      if (!data.length) { setStep('empty'); return }
      setPhrases(shuffle(data).slice(0, 10))
      setIndex(0)
      setScore({ correct: 0, incorrect: 0 })
      setStep('question')
    } catch { setStep('empty') }
  }, [])

  useEffect(() => { load() }, [load])

  // フォーカス管理
  useEffect(() => {
    if (step === 'question') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [step, index])

  const current = phrases[index]
  const total = phrases.length
  const answered = score.correct + score.incorrect

  function speak(phrase: string) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(phrase)
    utt.lang = 'en-US'; utt.rate = 0.85
    utt.onend = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utt)
  }

  async function handleSubmit() {
    if (!answer.trim() || !current) return
    setStep('judging')

    try {
      const res = await fetch('/api/quiz/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase: current.phrase,
          user_answer: answer,
          meaning_ja: current.meaning_ja,
        }),
      })
      const data: JudgeResponse = await res.json()
      setJudgment(data)
      setScore((s) => ({
        correct: s.correct + (data.correct ? 1 : 0),
        incorrect: s.incorrect + (data.correct ? 0 : 1),
      }))
      speak(current.phrase)
      setStep('result')
    } catch {
      setStep('question')
    }
  }

  function handleNext() {
    const next = index + 1
    if (next >= total) { setStep('done'); return }
    setIndex(next)
    setAnswer('')
    setJudgment(null)
    setStep('question')
  }

  // ───── 画面分岐 ─────

  if (step === 'loading') return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-slate-500 text-sm animate-pulse">読み込み中...</div>
    </div>
  )

  if (step === 'empty') return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-4xl">📭</p>
      <p className="text-slate-400 text-sm">フレーズが登録されていません</p>
      <Link href="/admin/import" className="text-sm text-blue-400 hover:underline">インポートして追加 →</Link>
    </div>
  )

  if (step === 'done') {
    const pct = Math.round((score.correct / total) * 100)
    const grade = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '💪'
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8 text-center">
          <div className="space-y-2">
            <p className="text-6xl">{grade}</p>
            <p className="text-5xl font-bold text-white">{pct}<span className="text-2xl text-slate-400">%</span></p>
            <p className="text-slate-400 text-sm">正解率</p>
          </div>
          <div className="flex justify-center gap-10">
            <div>
              <p className="text-3xl font-bold text-emerald-400">{score.correct}</p>
              <p className="text-xs text-slate-500 mt-1">正解</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-400">{score.incorrect}</p>
              <p className="text-xs text-slate-500 mt-1">不正解</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={load} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors">
              もう一度
            </button>
            <Link href="/" className="flex-1 py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors text-center">
              ホーム
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* ヘッダー */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between max-w-lg mx-auto w-full">
        <Link href="/" className="text-slate-500 hover:text-slate-300 text-lg">‹</Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-400 font-semibold">✓ {score.correct}</span>
          <span className="text-xs text-red-400 font-semibold">✗ {score.incorrect}</span>
          <span className="text-xs text-slate-500">{answered + 1}/{total}</span>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="px-4 max-w-lg mx-auto w-full">
        <Progress value={(answered / total) * 100} className="h-1" />
      </div>

      {/* メインカード */}
      <div className="flex-1 flex items-start justify-center px-4 pt-6 pb-8">
        {current && (
          <div className="w-full max-w-lg space-y-4">
            {/* フレーズカード */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center space-y-4">
              <span className={`text-xs font-bold ${DIFF_COLOR[current.difficulty] ?? DIFF_COLOR[3]}`}>
                Level {current.difficulty}
              </span>
              <div>
                <p className="text-4xl font-bold text-white tracking-wide leading-tight">{current.phrase}</p>
                {step === 'result' && current.pronunciation && (
                  <p className="text-sm text-slate-500 mt-2">{current.pronunciation}</p>
                )}
              </div>
              <button
                onClick={() => speak(current.phrase)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                  speaking ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-slate-400 hover:bg-white/20'
                }`}
              >
                🔊 発音
              </button>
            </div>

            {/* 回答エリア */}
            {step === 'question' && (
              <div className="space-y-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="日本語で意味を入力..."
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!answer.trim()}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  判定する
                </button>
              </div>
            )}

            {/* 判定中 */}
            {step === 'judging' && (
              <div className="text-center py-4">
                <p className="text-slate-400 text-sm animate-pulse">AIが判定中...</p>
              </div>
            )}

            {/* 結果 */}
            {step === 'result' && judgment && (
              <div className="space-y-3">
                {/* 判定バナー */}
                <div className={`rounded-2xl p-4 text-center ${judgment.correct ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                  <p className={`text-lg font-bold ${judgment.correct ? 'text-emerald-400' : 'text-red-400'}`}>
                    {judgment.correct ? '✓ 正解！' : '✗ 不正解'}
                  </p>
                  {judgment.feedback && (
                    <p className="text-xs text-slate-300 mt-1">{judgment.feedback}</p>
                  )}
                </div>

                {/* 正解 */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">正解</p>
                  <p className="text-white font-semibold">{current.meaning_ja}</p>
                  {current.original_context && (
                    <p className="text-xs text-slate-400 italic leading-relaxed border-t border-white/10 pt-2 mt-2">
                      &quot;{current.original_context}&quot;
                    </p>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  className="w-full py-3.5 rounded-2xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors"
                >
                  {index + 1 >= total ? '結果を見る' : '次のフレーズ →'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
