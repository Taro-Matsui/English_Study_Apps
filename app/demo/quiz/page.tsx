'use client'

import { useState, useCallback, useEffect } from 'react'
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

function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = 'en-US'
  utt.rate = 0.85
  window.speechSynthesis.speak(utt)
}

const DIFF_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: 'Lv.1', cls: 'bg-emerald-100 text-emerald-700' },
  2: { label: 'Lv.2', cls: 'bg-blue-100 text-blue-700' },
  3: { label: 'Lv.3', cls: 'bg-amber-100 text-amber-700' },
  4: { label: 'Lv.4', cls: 'bg-orange-100 text-orange-700' },
  5: { label: 'Lv.5', cls: 'bg-red-100 text-red-700' },
}

const RESULT_CLS: Record<JudgeResult['status'], string> = {
  correct: 'bg-emerald-50 border-emerald-300 text-emerald-700',
  partial: 'bg-amber-50 border-amber-300 text-amber-700',
  incorrect: 'bg-red-50 border-red-300 text-red-700',
}

export default function DemoQuizPage() {
  const [phrases] = useState<DemoPhrase[]>(() => shuffle(DEMO_PHRASES).slice(0, 10))
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<Step>('question')
  const [answer, setAnswer] = useState('')
  const [judgment, setJudgment] = useState<JudgeResult | null>(null)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [speaking, setSpeaking] = useState(false)

  const current = phrases[index]

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel() }
  }, [index])

  function handleSpeak() {
    setSpeaking(true)
    window.speechSynthesis?.cancel()
    const utt = new SpeechSynthesisUtterance(current.phrase)
    utt.lang = 'en-US'
    utt.rate = 0.85
    const t = setTimeout(() => setSpeaking(false), 3500)
    utt.onend = () => { setSpeaking(false); clearTimeout(t) }
    window.speechSynthesis.speak(utt)
  }

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
      // 正解時は自動で読み上げ
      if (data.status === 'correct') speak(current.phrase)
    } catch {
      setJudgment({ correct: false, status: 'incorrect', feedback: `正解: ${current.meaning_ja}` })
    }
    setStep('result')
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

  if (step === 'done') {
    const allAnswers = [...answers]
    const correct = allAnswers.filter((a) => a.result.status === 'correct').length
    const partial  = allAnswers.filter((a) => a.result.status === 'partial').length
    const pct = Math.round(((correct + partial * 0.5) / allAnswers.length) * 100)

    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 text-center space-y-3">
            <p className="text-5xl font-bold text-gray-900">{pct}<span className="text-2xl text-gray-400">%</span></p>
            <p className="text-gray-500 text-sm">{correct}問正解 / {allAnswers.length}問中</p>
            <div className="flex justify-center gap-4 text-sm">
              <span className="text-emerald-600 font-semibold">正解 {correct}</span>
              <span className="text-amber-600 font-semibold">惜しい {partial}</span>
              <span className="text-gray-400">不正解 {allAnswers.length - correct - partial}</span>
            </div>
          </div>

          <div className="bg-white border border-amber-100 shadow-sm rounded-2xl p-5 space-y-2">
            <p className="text-gray-900 font-bold">登録して続きを学ぼう</p>
            <p className="text-gray-500 text-sm">
              自分の会議録・ドキュメントからフレーズを抽出・保存できます。学習履歴も記録されます。
            </p>
            <Link
              href="/login"
              className="inline-block mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              無料アカウント登録 →
            </Link>
          </div>

          <div className="flex gap-3">
            <Link href="/demo" className="flex-1 text-center text-sm text-gray-500 hover:text-gray-800 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
              ← デモトップ
            </Link>
            <button
              onClick={() => { setIndex(0); setAnswers([]); setAnswer(''); setJudgment(null); setStep('question') }}
              className="flex-1 text-center text-sm text-gray-500 hover:text-gray-800 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
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
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">

        {/* デモバナー */}
        <div className="flex items-center justify-between">
          <Link href="/demo" className="text-xs text-gray-400 hover:text-gray-600">← デモトップ</Link>
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">デモモード</span>
        </div>

        {/* 進捗 */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{index + 1} / {phrases.length}</span>
            <span>{answers.filter((a) => a.result.status === 'correct').length}正解</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(index / phrases.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 問題カード */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 space-y-4 text-center">
          <div className="flex justify-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${diff.cls}`}>{diff.label}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{current.usage_scene}</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <p className="text-2xl font-bold text-gray-900 tracking-wide">{current.phrase}</p>
            <button
              onClick={handleSpeak}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-colors flex-shrink-0 ${
                speaking ? 'bg-blue-500/20 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              title="読み上げ"
            >
              🔊
            </button>
          </div>
          <p className="text-xs text-gray-400">日本語の意味を入力してください</p>
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
              className="w-full bg-white border border-gray-200 text-gray-900 placeholder-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              style={{ fontSize: '16px' }}
              autoFocus
            />
            <button
              onClick={handleSubmit}
              disabled={!answer.trim() || step === 'judging'}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {step === 'judging' ? 'AI判定中…' : '回答する'}
            </button>
            {step === 'judging' && (
              <div className="h-1 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-pulse rounded-full w-full" />
              </div>
            )}
          </div>
        )}

        {/* 判定結果 */}
        {step === 'result' && judgment && (
          <div className="space-y-3">
            <div className={`rounded-xl p-4 space-y-2 border ${RESULT_CLS[judgment.status]}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {judgment.status === 'correct' ? '✅' : judgment.status === 'partial' ? '🔶' : '❌'}
                </span>
                <span className="font-bold text-sm">
                  {judgment.status === 'correct' ? '正解！' : judgment.status === 'partial' ? '惜しい！' : '不正解'}
                </span>
                {judgment.feedback && (
                  <span className="text-xs text-gray-500 ml-auto text-right max-w-[160px]">{judgment.feedback}</span>
                )}
              </div>
              <p className="text-sm text-gray-700">
                <span className="text-gray-400 text-xs">正解: </span>{current.meaning_ja}
              </p>
            </div>
            <button
              onClick={handleNext}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm transition-colors"
            >
              {index + 1 >= phrases.length ? '結果を見る' : '次の問題 →'}
            </button>
          </div>
        )}

        {/* デモCTA */}
        <p className="text-center text-xs text-gray-400">
          自分のフレーズで学習したい場合は{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 underline">無料登録</Link>
        </p>
      </div>
    </div>
  )
}
