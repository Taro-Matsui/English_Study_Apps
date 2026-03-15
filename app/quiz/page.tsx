'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface QuizPhrase {
  id: string
  phrase: string
  pronunciation: string | null
  meaning_ja: string | null
  original_context: string | null
  difficulty: number
  source_title: string | null
}

type QuizStep = 'loading' | 'question' | 'reveal' | 'done' | 'empty'

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export default function QuizPage() {
  const [phrases, setPhrases] = useState<QuizPhrase[]>([])
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<QuizStep>('loading')
  const [score, setScore] = useState({ correct: 0, incorrect: 0 })
  const [speaking, setSpeaking] = useState(false)

  const loadPhrases = useCallback(async () => {
    setStep('loading')
    try {
      const res = await fetch('/api/quiz?limit=10')
      const data: QuizPhrase[] = await res.json()
      if (!data.length) { setStep('empty'); return }
      setPhrases(shuffle(data).slice(0, 10))
      setIndex(0)
      setScore({ correct: 0, incorrect: 0 })
      setStep('question')
    } catch {
      setStep('empty')
    }
  }, [])

  useEffect(() => { loadPhrases() }, [loadPhrases])

  const current = phrases[index]
  const total = phrases.length
  const answered = score.correct + score.incorrect

  function speak() {
    if (!current || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(current.phrase)
    utt.lang = 'en-US'
    utt.rate = 0.85
    utt.onend = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utt)
  }

  function handleReveal() {
    setStep('reveal')
    speak()
  }

  function handleAnswer(correct: boolean) {
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      incorrect: s.incorrect + (correct ? 0 : 1),
    }))
    const next = index + 1
    if (next >= total) {
      setStep('done')
    } else {
      setIndex(next)
      setStep('question')
    }
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">フレーズを読み込み中...</div>
      </div>
    )
  }

  if (step === 'empty') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-4xl">📭</p>
        <p className="text-gray-500 text-sm">フレーズが登録されていません</p>
        <Link href="/admin/import" className="text-sm text-blue-500 hover:underline">
          インポートしてフレーズを追加する →
        </Link>
      </div>
    )
  }

  if (step === 'done') {
    const pct = Math.round((score.correct / total) * 100)
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div>
            <p className="text-5xl font-bold text-gray-900">{pct}%</p>
            <p className="text-gray-500 mt-1 text-sm">正解率</p>
          </div>
          <div className="flex justify-center gap-6 text-sm">
            <div>
              <span className="text-2xl font-bold text-green-600">{score.correct}</span>
              <p className="text-gray-400">正解</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-red-400">{score.incorrect}</span>
              <p className="text-gray-400">不正解</p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadPhrases}
              className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              もう一度
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              ホームへ
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto space-y-5">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← ホーム</Link>
          <span className="text-sm text-gray-500">{answered + 1} / {total}</span>
        </div>

        {/* 進捗 */}
        <Progress value={(answered / total) * 100} className="h-1.5" />

        {/* スコア */}
        <div className="flex gap-3 text-xs">
          <span className="text-green-600 font-medium">✓ {score.correct}</span>
          <span className="text-red-400 font-medium">✗ {score.incorrect}</span>
        </div>

        {/* 問題カード */}
        {current && (
          <Card className="shadow-sm">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                {/* 難易度 */}
                <Badge variant="secondary" className="text-xs">
                  難易度 {current.difficulty}
                </Badge>

                {/* フレーズ */}
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-gray-900 tracking-wide">
                    {current.phrase}
                  </p>
                  {step === 'reveal' && current.pronunciation && (
                    <p className="text-sm text-gray-400">{current.pronunciation}</p>
                  )}
                </div>

                {/* 発音ボタン */}
                <button
                  onClick={speak}
                  className={`mx-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                    speaking ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  🔊 発音を聞く
                </button>

                {/* 回答前 */}
                {step === 'question' && (
                  <div className="pt-4">
                    <button
                      onClick={handleReveal}
                      className="w-full py-3 rounded-lg bg-gray-800 text-white text-sm font-semibold hover:bg-gray-700 transition-colors"
                    >
                      意味を確認する
                    </button>
                  </div>
                )}

                {/* 回答後（意味表示） */}
                {step === 'reveal' && (
                  <div className="pt-2 space-y-4">
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-left space-y-2">
                      <p className="text-blue-800 font-semibold text-base">{current.meaning_ja}</p>
                      {current.original_context && (
                        <p className="text-xs text-blue-500 italic leading-relaxed">
                          &quot;{current.original_context}&quot;
                        </p>
                      )}
                      {current.source_title && (
                        <p className="text-xs text-blue-400">出典: {current.source_title}</p>
                      )}
                    </div>

                    <p className="text-xs text-gray-400">知っていましたか？</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAnswer(false)}
                        className="flex-1 py-2.5 rounded-lg border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors"
                      >
                        ✗ 知らなかった
                      </button>
                      <button
                        onClick={() => handleAnswer(true)}
                        className="flex-1 py-2.5 rounded-lg border-2 border-green-200 text-green-600 text-sm font-semibold hover:bg-green-50 transition-colors"
                      >
                        ✓ 知っていた
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
