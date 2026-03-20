'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { DEMO_PHRASES, type DemoPhrase } from '../phrases'

type Step = 'question' | 'judging' | 'result' | 'done'

interface JudgeResult {
  correct: boolean
  status: 'correct' | 'partial' | 'incorrect'
  feedback: string
}

interface AnswerRecord {
  phrase: DemoPhrase
  userAnswer: string
  result: JudgeResult
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const DIFF_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: 'Lv.1', cls: 'bg-emerald-100 text-emerald-700' },
  2: { label: 'Lv.2', cls: 'bg-blue-100 text-blue-700' },
  3: { label: 'Lv.3', cls: 'bg-amber-100 text-amber-700' },
  4: { label: 'Lv.4', cls: 'bg-orange-100 text-orange-700' },
  5: { label: 'Lv.5', cls: 'bg-red-100 text-red-700' },
}

export default function DemoQuizPage() {
  const [phrases] = useState<DemoPhrase[]>(() => shuffle(DEMO_PHRASES).slice(0, 10))
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<Step>('question')
  const [answer, setAnswer] = useState('')
  const [judgment, setJudgment] = useState<JudgeResult | null>(null)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])

  const current = phrases[index]

  const handleSubmit = useCallback(async () => {
    if (!answer.trim() || step !== 'question') return
    setStep('judging')

    try {
      const res = await fetch('/api/demo/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase: current.phrase,
          user_answer: answer,
          meaning_ja: current.meaning_ja,
        }),
      })
      const data: JudgeResult = await res.json()
      setJudgment(data)
      setStep('result')
    } catch {
      setJudgment({ correct: false, status: 'incorrect', feedback: '通信エラー' })
      setStep('result')
    }
  }, [answer, current, step])

  function handleNext() {
    if (!judgment) return
    setAnswers((prev) => [...prev, { phrase: current, userAnswer: answer, result: judgment }])
    if (index + 1 >= phrases.length) {
      setStep('done')
    } else {
      setIndex((i) => i + 1)
      setAnswer('')
      setJudgment(null)
      setStep('question')
    }
  }

  // done screen
  if (step === 'done') {
    const allAnswers = [...answers]
    const correct = allAnswers.filter((a) => a.result.status === 'correct').length
    const partial = allAnswers.filter((a) => a.result.status === 'partial').length
    const pct = Math.round(((correct + partial * 0.5) / allAnswers.length) * 100)

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-white/10 rounded-2xl p-6 text-center space-y-3">
            <p className="text-5xl font-bold text-white">{pct}<span className="text-2xl">%</span></p>
            <p className="text-slate-300 text-sm">{correct}問正解 / {allAnswers.length}問中</p>
            <div className="flex justify-center gap-4 text-sm">
              <span className="text-emerald-400">正解 {correct}</span>
              <span className="text-amber-400">惜しい {partial}</span>
              <span className="text-slate-400">不正解 {allAnswers.length - correct - partial}</span>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-600 to-blue-600 rounded-2xl p-5 space-y-2">
            <p className="text-white font-bold">登録して続きを学ぼう</p>
            <p className="text-emerald-100 text-sm">
              自分の会議録・ドキュメントからフレーズを抽出・保存できます。
              学習履歴も記録されます。
            </p>
            <Link
              href="/login"
              className="inline-block mt-2 bg-white text-emerald-700 font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-emerald-50 transition-colors"
            >
              無料アカウント登録 →
            </Link>
          </div>

          <div className="flex gap-3">
            <Link href="/demo" className="flex-1 text-center text-sm text-slate-400 hover:text-white py-2 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
              ← デモトップ
            </Link>
            <button
              onClick={() => { setIndex(0); setAnswers([]); setAnswer(''); setJudgment(null); setStep('question') }}
              className="flex-1 text-center text-sm text-slate-400 hover:text-white py-2 rounded-xl border border-white/10 hover:border-white/20 transition-colors"
            >
              もう一度
            </button>
          </div>
        </div>
      </div>
    )
  }

  const diff = DIFF_LABELS[current.difficulty] ?? DIFF_LABELS[1]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">

        {/* デモバナー */}
        <div className="flex items-center justify-between">
          <Link href="/demo" className="text-xs text-slate-500 hover:text-slate-300">← デモトップ</Link>
          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">デモモード</span>
        </div>

        {/* 進捗 */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{index + 1} / {phrases.length}</span>
            <span>
              {answers.filter((a) => a.result.status === 'correct').length}正解
            </span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${((index) / phrases.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 問題カード */}
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 space-y-4 text-center">
          <div className="flex justify-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${diff.cls}`}>{diff.label}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400">{current.usage_scene}</span>
          </div>
          <p className="text-2xl font-bold text-white tracking-wide">{current.phrase}</p>
          <p className="text-xs text-slate-400">日本語の意味を入力してください</p>
        </div>

        {/* 回答入力 */}
        {(step === 'question' || step === 'judging') && (
          <div className="space-y-3">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="意味を日本語で入力…"
              disabled={step === 'judging'}
              className="w-full bg-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              style={{ fontSize: '16px' }}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || step === 'judging'}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {step === 'judging' ? 'AI判定中…' : '回答する'}
            </button>
          </div>
        )}

        {/* 判定結果 */}
        {step === 'result' && judgment && (
          <div className="space-y-3">
            <div className={`rounded-xl p-4 space-y-2 ${
              judgment.status === 'correct' ? 'bg-emerald-500/20 border border-emerald-500/40' :
              judgment.status === 'partial' ? 'bg-amber-500/20 border border-amber-500/40' :
              'bg-red-500/20 border border-red-500/40'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {judgment.status === 'correct' ? '✅' : judgment.status === 'partial' ? '🔶' : '❌'}
                </span>
                <span className="font-semibold text-white text-sm">
                  {judgment.status === 'correct' ? '正解！' : judgment.status === 'partial' ? '惜しい！' : '不正解'}
                </span>
                {judgment.feedback && (
                  <span className="text-xs text-slate-300 ml-auto">{judgment.feedback}</span>
                )}
              </div>
              <p className="text-sm text-slate-200">
                <span className="text-slate-400 text-xs">正解: </span>{current.meaning_ja}
              </p>
            </div>
            <button
              onClick={handleNext}
              className="w-full bg-white/10 hover:bg-white/15 text-white font-medium py-3 rounded-xl text-sm transition-colors"
            >
              {index + 1 >= phrases.length ? '結果を見る' : '次の問題 →'}
            </button>
          </div>
        )}

        {/* デモCTA */}
        <p className="text-center text-xs text-slate-600">
          自分のフレーズで学習したい場合は{' '}
          <Link href="/login" className="text-slate-400 hover:text-white underline">無料登録</Link>
        </p>
      </div>
    </div>
  )
}
