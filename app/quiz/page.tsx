'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import type { QuizAnswerRecord, UsageScene, EngineerLevel } from '@/types'
import type { JudgeResponse } from '../api/quiz/judge/route'

interface QuizPhrase {
  id: string
  phrase: string
  pronunciation: string | null
  meaning_ja: string | null
  original_context: string | null
  difficulty: number
  source_title: string | null
  usage_scene: UsageScene | null
  engineer_level: EngineerLevel | null
}

type Step = 'loading' | 'question' | 'judging' | 'result' | 'done' | 'empty'
type Speed = 'fast' | 'normal' | 'slow'

const SPEED_RATE: Record<Speed, number> = { fast: 1.3, normal: 0.88, slow: 0.6 }
const SPEED_LABEL: Record<Speed, string> = { fast: '早口', normal: '普通', slow: 'ゆっくり' }

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }

const SCENE_LABEL: Record<UsageScene, string> = {
  daily: '日常会話', technical: 'テクニカル', business: 'ビジネス', other: 'その他',
}
const SCENE_CLS: Record<UsageScene, string> = {
  daily: 'bg-emerald-500/20 text-emerald-400',
  technical: 'bg-sky-500/20 text-sky-400',
  business: 'bg-violet-500/20 text-violet-400',
  other: 'bg-slate-500/20 text-slate-400',
}
const LEVEL_LABEL: Record<EngineerLevel, string> = { junior: '初級', mid: '中級', senior: '上級' }
const LEVEL_CLS: Record<EngineerLevel, string> = {
  junior: 'bg-emerald-500/20 text-emerald-400',
  mid: 'bg-amber-500/20 text-amber-400',
  senior: 'bg-red-500/20 text-red-400',
}

function highlightPhrase(text: string, phrase: string): React.ReactNode {
  if (!phrase || !text) return <>{text}</>
  const idx = text.toLowerCase().indexOf(phrase.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-400/30 text-amber-300 rounded px-0.5 not-italic font-semibold">
        {text.slice(idx, idx + phrase.length)}
      </mark>
      {text.slice(idx + phrase.length)}
    </>
  )
}

export default function QuizPage() {
  const [phrases, setPhrases] = useState<QuizPhrase[]>([])
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<Step>('loading')
  const [score, setScore] = useState({ correct: 0, incorrect: 0 })
  const [answer, setAnswer] = useState('')
  const [judgment, setJudgment] = useState<JudgeResponse | null>(null)
  const [answers, setAnswers] = useState<QuizAnswerRecord[]>([])
  const [speaking, setSpeaking] = useState<string | null>(null)  // 'phrase' | 'context' | null
  const [speed, setSpeed] = useState<Speed>('normal')
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setStep('loading'); setAnswers([])
    try {
      const res = await fetch('/api/quiz?limit=10')
      const data: QuizPhrase[] = await res.json()
      if (!data.length) { setStep('empty'); return }
      setPhrases(shuffle(data).slice(0, 10))
      setIndex(0); setScore({ correct: 0, incorrect: 0 }); setStep('question')
    } catch { setStep('empty') }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (step === 'question') setTimeout(() => inputRef.current?.focus(), 100)
  }, [step, index])

  const current = phrases[index]
  const total = phrases.length
  const answered = score.correct + score.incorrect

  function speak(text: string, key: string) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    if (speaking === key) { setSpeaking(null); return }
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'en-US'; utt.rate = SPEED_RATE[speed]
    utt.onend = () => setSpeaking(null)
    setSpeaking(key); window.speechSynthesis.speak(utt)
  }

  async function handleSubmit() {
    if (!answer.trim() || !current) return
    setStep('judging')
    try {
      const res = await fetch('/api/quiz/judge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase: current.phrase,
          user_answer: answer,
          meaning_ja: current.meaning_ja,
          original_context: current.original_context ?? undefined,
        }),
      })
      const data: JudgeResponse = await res.json()
      setJudgment(data)
      setScore((s) => ({ correct: s.correct + (data.correct ? 1 : 0), incorrect: s.incorrect + (data.correct ? 0 : 1) }))
      setAnswers((prev) => [...prev, {
        phrase_id: current.id, phrase: current.phrase, meaning_ja: current.meaning_ja ?? '',
        user_answer: answer, is_correct: data.correct, ai_feedback: data.feedback,
      }])
      speak(current.phrase, 'phrase'); setStep('result')
    } catch { setStep('question') }
  }

  function handleNext() {
    window.speechSynthesis?.cancel(); setSpeaking(null)
    window.scrollTo({ top: 0, behavior: 'instant' })
    const next = index + 1
    if (next >= total) {
      setStep('done')
      fetch('/api/quiz/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      }).catch(() => {})
      return
    }
    setIndex(next); setAnswer(''); setJudgment(null); setStep('question')
  }

  const SpeedSelector = () => (
    <div className="flex items-center gap-0.5 bg-white/5 rounded-full px-1.5 py-1">
      {(['slow', 'normal', 'fast'] as Speed[]).map((s) => (
        <button
          key={s}
          onClick={() => setSpeed(s)}
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
            speed === s ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {SPEED_LABEL[s]}
        </button>
      ))}
    </div>
  )

  if (step === 'loading') return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-slate-500 text-sm animate-pulse">読み込み中...</p>
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
      <div className="min-h-screen bg-slate-900 flex flex-col p-4">
        <div className="max-w-lg mx-auto w-full pt-8 space-y-5">
          <div className="text-center space-y-2">
            <p className="text-5xl">{grade}</p>
            <p className="text-5xl font-bold text-white">{pct}<span className="text-2xl text-slate-400">%</span></p>
            <div className="flex justify-center gap-8 pt-2">
              <div><p className="text-3xl font-bold text-emerald-400">{score.correct}</p><p className="text-xs text-slate-500 mt-1">正解</p></div>
              <div><p className="text-3xl font-bold text-red-400">{score.incorrect}</p><p className="text-xs text-slate-500 mt-1">不正解</p></div>
            </div>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {answers.map((a, i) => (
              <div key={i} className={`rounded-xl p-3 border text-sm ${a.is_correct ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{a.phrase}</span>
                  <span className={`text-xs ${a.is_correct ? 'text-emerald-400' : 'text-red-400'}`}>{a.is_correct ? '✓ 正解' : '✗ 不正解'}</span>
                </div>
                <p className="text-slate-400 text-xs mt-1">回答: {a.user_answer}</p>
                {!a.is_correct && <p className="text-slate-300 text-xs mt-0.5">正解: {a.meaning_ja}</p>}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors">もう一度</button>
            <Link href="/history" className="flex-1 py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors text-center">記録</Link>
            <Link href="/" className="flex-1 py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors text-center">ホーム</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between max-w-lg mx-auto w-full">
        <Link href="/" className="text-slate-500 hover:text-slate-300 text-lg">‹</Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-emerald-400 font-semibold">✓ {score.correct}</span>
          <span className="text-xs text-red-400 font-semibold">✗ {score.incorrect}</span>
          <span className="text-xs text-slate-500">{answered + 1}/{total}</span>
        </div>
      </div>
      <div className="px-4 max-w-lg mx-auto w-full">
        <Progress value={(answered / total) * 100} className="h-1" />
      </div>
      <div className="flex-1 flex items-start justify-center px-4 pt-5 pb-8">
        {current && (
          <div className="w-full max-w-lg space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-7 text-center space-y-3">
              <div className="flex justify-center gap-2 flex-wrap">
                {current.usage_scene && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${SCENE_CLS[current.usage_scene]}`}>
                    {SCENE_LABEL[current.usage_scene]}
                  </span>
                )}
                {current.engineer_level && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${LEVEL_CLS[current.engineer_level]}`}>
                    {LEVEL_LABEL[current.engineer_level]}
                  </span>
                )}
              </div>
              <p className="text-4xl font-bold text-white tracking-wide">{current.phrase}</p>
              {step === 'result' && current.pronunciation && (
                <p className="text-sm text-slate-500">{current.pronunciation}</p>
              )}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button onClick={() => speak(current.phrase, 'phrase')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${speaking === 'phrase' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-slate-400 hover:bg-white/20'}`}>
                  🔊 フレーズ
                </button>
                <SpeedSelector />
              </div>
            </div>

            {step === 'question' && (
              <div className="space-y-3">
                <input ref={inputRef} type="text" value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="日本語で意味を入力..."
                  className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button onClick={handleSubmit} disabled={!answer.trim()}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  判定する
                </button>
              </div>
            )}

            {step === 'judging' && (
              <p className="text-center text-slate-400 text-sm animate-pulse py-4">AIが判定中...</p>
            )}

            {step === 'result' && judgment && (
              <div className="space-y-3">
                <div className={`rounded-2xl p-4 text-center ${judgment.correct ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
                  <p className={`text-lg font-bold ${judgment.correct ? 'text-emerald-400' : 'text-red-400'}`}>
                    {judgment.correct ? '✓ 正解！' : '✗ 不正解'}
                  </p>
                  {judgment.feedback && <p className="text-xs text-slate-300 mt-1">{judgment.feedback}</p>}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">正解の意味</p>
                    <p className="text-white font-semibold">{current.meaning_ja}</p>
                  </div>
                  {current.original_context && (
                    <div className="border-t border-white/10 pt-3 space-y-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">使用例</p>
                      {/* 英文 + 発音ボタン */}
                      <div className="flex items-start gap-2">
                        <p className="flex-1 text-sm text-slate-200 italic leading-relaxed">
                          &ldquo;{highlightPhrase(current.original_context, current.phrase)}&rdquo;
                        </p>
                        <button
                          onClick={() => speak(current.original_context!, 'context')}
                          className={`flex-shrink-0 mt-0.5 px-2 py-1 rounded-full text-[10px] transition-colors ${speaking === 'context' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-slate-400 hover:bg-white/20'}`}
                        >
                          🔊
                        </button>
                      </div>
                      {/* 日本語全訳 */}
                      {judgment.context_ja && (
                        <p className="text-xs text-slate-400 leading-relaxed bg-white/5 rounded-xl px-3 py-2">
                          {judgment.context_ja}
                        </p>
                      )}
                      {/* フレーズハイライト注釈 */}
                      <p className="text-xs text-slate-500 leading-relaxed">
                        ※{' '}
                        <mark className="bg-amber-400/20 text-amber-300 not-italic rounded px-0.5 font-semibold">{current.phrase}</mark>
                        {' '}={' '}
                        <mark className="bg-amber-400/20 text-amber-300 not-italic rounded px-0.5">{current.meaning_ja}</mark>
                      </p>
                    </div>
                  )}
                </div>

                <button onClick={handleNext}
                  className="w-full py-3.5 rounded-2xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors">
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
