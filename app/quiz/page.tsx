'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Progress } from '@/components/ui/progress'
import type { QuizAnswerRecord, UsageScene, EngineerLevel } from '@/types'
import type { JudgeResponse, JudgeStatus } from '../api/quiz/judge/route'
import type { ExplainResponse } from '../api/quiz/explain/route'
import { useLanguage, LangToggle } from '@/lib/i18n'
import { useSettings, getVoiceForPreset, VoicePreset } from '@/lib/settings'
import { useAuth } from '@/lib/auth-context'
import { generateQuizResultImage, getShareText } from '@/lib/share-image'

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

const SCENE_CLS: Record<UsageScene, string> = {
  daily: 'bg-emerald-500/20 text-emerald-400',
  technical: 'bg-sky-500/20 text-sky-400',
  business: 'bg-violet-500/20 text-violet-400',
  other: 'bg-slate-500/20 text-slate-400',
}
const LEVEL_CLS: Record<EngineerLevel, string> = {
  junior: 'bg-emerald-500/20 text-emerald-400',
  mid: 'bg-amber-500/20 text-amber-400',
  senior: 'bg-red-500/20 text-red-400',
}

const STATUS_CLS: Record<JudgeStatus, { cls: string; textCls: string }> = {
  correct:   { cls: 'bg-emerald-500/20 border-emerald-500/30', textCls: 'text-emerald-400' },
  partial:   { cls: 'bg-amber-500/20 border-amber-500/30',   textCls: 'text-amber-400'   },
  incorrect: { cls: 'bg-red-500/20 border-red-500/30',       textCls: 'text-red-400'     },
}
const RESULT_CLS: Record<JudgeStatus, string> = {
  correct: 'text-emerald-400',
  partial: 'text-amber-400',
  incorrect: 'text-red-400',
}

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5) }


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

/** フレーズをマスクしたコンテキスト文を返す */
function maskPhrase(context: string, phrase: string): string {
  return context.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '___')
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center"><p className="text-gray-400 dark:text-slate-500 text-sm animate-pulse">読み込み中...</p></div>}>
      <QuizContent />
    </Suspense>
  )
}

function QuizContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isFocusMode = searchParams.get('mode') === 'focus'

  const { t } = useLanguage()
  const { settings, markMastered, setVoicePreset } = useSettings()
  const { user } = useAuth()
  const [phrases, setPhrases] = useState<QuizPhrase[]>([])
  const [index, setIndex] = useState(0)
  const [step, setStep] = useState<Step>('loading')
  const [score, setScore] = useState({ correct: 0, partial: 0, incorrect: 0 })
  const [answer, setAnswer] = useState('')
  const [judgment, setJudgment] = useState<JudgeResponse | null>(null)
  const [answers, setAnswers] = useState<QuizAnswerRecord[]>([])
  const [speaking, setSpeaking] = useState<string | null>(null)
  const [speed, setSpeed] = useState<Speed>('normal')
  const [saveState, setSaveState] = useState<'saving' | 'saved' | 'failed' | null>(null)
  const [sharing, setSharing] = useState(false)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [explaining, setExplaining] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const questionStartTime = useRef<number>(0)

  const load = useCallback(async (focusMode = isFocusMode) => {
    setStep('loading'); setAnswers([])
    setSaveState(null)
    try {
      let excludeIds: string[] = []
      let skipMastered = false
      try {
        const saved = JSON.parse(localStorage.getItem('app_settings') ?? '{}')
        skipMastered = Boolean(saved.skipMastered)
        if (skipMastered && (saved.masteredIds as string[] | undefined)?.length) {
          excludeIds = (saved.masteredIds as string[]).slice(0, 500)
        }
      } catch {}

      // 通常モード + skipMastered 無効 → プリフェッチキャッシュを利用して即起動
      if (!focusMode && !skipMastered) {
        try {
          const cached = sessionStorage.getItem('quiz_prefetch')
          if (cached) {
            const { phrases: cachedPhrases, ts } = JSON.parse(cached) as { phrases: QuizPhrase[]; ts: number }
            sessionStorage.removeItem('quiz_prefetch') // 使い切り
            if (Date.now() - ts < 90_000 && cachedPhrases.length) {
              setPhrases(shuffle(cachedPhrases).slice(0, 10))
              setIndex(0); setScore({ correct: 0, partial: 0, incorrect: 0 }); setStep('question')
              return
            }
          }
        } catch {}
      }

      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10, exclude: excludeIds, mode: focusMode ? 'focus' : 'normal' }),
      })
      const data: QuizPhrase[] = await res.json()
      if (!data.length) { setStep('empty'); return }
      setPhrases(shuffle(data).slice(0, 10))
      setIndex(0); setScore({ correct: 0, partial: 0, incorrect: 0 }); setStep('question')
    } catch { setStep('empty') }
  }, [isFocusMode])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (step === 'question') {
      questionStartTime.current = Date.now()
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
      setTimeout(() => inputRef.current?.focus(), 80)
    }
    if (step === 'result') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [step, index])

  const current = phrases[index]
  const total = phrases.length
  const answered = score.correct + score.partial + score.incorrect

  function speak(text: string, key: string) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    if (speaking === key) { setSpeaking(null); return }
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = SPEED_RATE[speed]
    const voice = getVoiceForPreset(settings.voicePreset, settings.voiceURI)
    if (voice) {
      utt.voice = voice
      utt.lang = voice.lang
    } else {
      utt.lang = 'en-US'
    }
    utt.onend = () => setSpeaking(null)
    setSpeaking(key); window.speechSynthesis.speak(utt)
  }

  const VOICE_PRESETS: { key: VoicePreset; label: string }[] = [
    { key: 'default',    label: '既定' },
    { key: 'us-female',  label: '♀ US' },
    { key: 'us-male',    label: '♂ US' },
    { key: 'indian',     label: '🇮🇳 IN' },
  ]

  const VoiceSelector = () => (
    <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-white/5 rounded-full px-1.5 py-1">
      {VOICE_PRESETS.map(({ key, label }) => (
        <button key={key} onClick={() => setVoicePreset(key)}
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
            settings.voicePreset === key ? 'bg-blue-500 text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
          }`}>
          {label}
        </button>
      ))}
    </div>
  )

  async function handleSubmit() {
    if (!answer.trim() || !current) return
    const responseTimeMs = Date.now() - questionStartTime.current
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
      const status: JudgeStatus = data.status ?? (data.correct ? 'correct' : 'incorrect')
      setJudgment({ ...data, status })
      setScore((s) => ({
        correct:   s.correct   + (status === 'correct'   ? 1 : 0),
        partial:   s.partial   + (status === 'partial'   ? 1 : 0),
        incorrect: s.incorrect + (status === 'incorrect' ? 1 : 0),
      }))
      setAnswers((prev) => [...prev, {
        phrase_id: current.id, phrase: current.phrase, meaning_ja: current.meaning_ja ?? '',
        user_answer: answer, is_correct: data.correct, ai_feedback: data.feedback,
        status,
        response_time_ms: responseTimeMs,
      }])
      if (status === 'correct') markMastered(current.id)
      speak(current.phrase, 'phrase'); setStep('result')
    } catch { setStep('question') }
  }

  async function handleExplain() {
    if (!current || explaining) return
    setExplaining(true)
    try {
      const res = await fetch('/api/quiz/explain', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase_id: current.id,
          phrase: current.phrase,
          meaning_ja: current.meaning_ja,
          original_context: current.original_context ?? undefined,
        }),
      })
      const data: ExplainResponse = await res.json()
      setExplanation(data.explanation || data.error || '解説を取得できませんでした')
    } catch {
      setExplanation('通信エラーが発生しました')
    }
    setExplaining(false)
  }

  function handleNext() {
    window.speechSynthesis?.cancel(); setSpeaking(null)
    setExplanation(null)
    const next = index + 1
    if (next >= total) {
      setStep('done')
      setSaveState('saving')
      fetch('/api/quiz/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
        .then((r) => r.json())
        .then((d) => setSaveState(d.success ? 'saved' : 'failed'))
        .catch(() => setSaveState('failed'))
      return
    }
    setIndex(next); setAnswer(''); setJudgment(null); setStep('question')
  }

  async function handleShare(pct: number) {
    if (sharing) return
    setSharing(true)
    const studyPurpose = user?.user_metadata?.study_purpose as string | undefined
    const isDark = settings.colorTheme === 'dark' ||
      (settings.colorTheme === 'system' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    const params = {
      pct,
      correct: score.correct,
      total,
      partial: score.partial,
      incorrect: score.incorrect,
      theme: isDark ? 'dark' as const : 'light' as const,
      studyPurpose,
    }
    try {
      const shareText = getShareText(params)
      // 画像生成 → 自動ダウンロード
      try {
        const blob = await generateQuizResultImage(params)
        const objUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objUrl
        a.download = 'reel-result.png'
        a.click()
        setTimeout(() => URL.revokeObjectURL(objUrl), 1000)
      } catch {}
      // X 投稿ページを直接開く
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
        '_blank',
        'noopener,noreferrer',
      )
    } finally {
      setSharing(false)
    }
  }

  const SpeedSelector = () => (
    <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-white/5 rounded-full px-1.5 py-1">
      {(['slow', 'normal', 'fast'] as Speed[]).map((s) => (
        <button key={s} onClick={() => setSpeed(s)}
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-colors ${speed === s ? 'bg-blue-500 text-white' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}>
          {t(`speed_${s}` as 'speed_fast' | 'speed_normal' | 'speed_slow')}
        </button>
      ))}
    </div>
  )

  if (step === 'loading') return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
      <p className="text-gray-400 dark:text-slate-500 text-sm animate-pulse">
        {isFocusMode ? '⚠️ 弱点フレーズを読み込み中...' : t('quiz_loading')}
      </p>
    </div>
  )

  if (step === 'empty') return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-4xl">📭</p>
      <p className="text-gray-500 dark:text-slate-400 text-sm">
        {isFocusMode ? '弱点フレーズが見つかりません。通常クイズに切り替えます。' : t('quiz_empty')}
      </p>
      {isFocusMode
        ? <Link href="/quiz" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">通常クイズを開始</Link>
        : <Link href="/library/import" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">{t('quiz_empty_link')}</Link>
      }
    </div>
  )

  if (step === 'done') {
    const pct = Math.round((score.correct / total) * 100)
    const grade = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '💪'
    const motivationMsg = pct >= 80
      ? 'この調子で明日も続けよう！'
      : pct >= 60
      ? '毎日続ければ必ず上達する！'
      : '挑戦を続けることが上達の近道！'
    const isHighScore = pct >= 80
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col p-4">
        <div className="max-w-lg mx-auto w-full pt-8 space-y-5">
          <div className="text-center space-y-2">
            <p className="text-5xl">{grade}</p>
            <p className="text-base font-semibold text-gray-600 dark:text-slate-300">{motivationMsg}</p>
            <p className="text-5xl font-bold text-gray-900 dark:text-white">{pct}<span className="text-2xl text-gray-400 dark:text-slate-400">%</span></p>
            <div className="flex justify-center gap-6 pt-2">
              <div><p className="text-3xl font-bold text-emerald-500 dark:text-emerald-400">{score.correct}</p><p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t('done_correct')}</p></div>
              <div><p className="text-3xl font-bold text-amber-500 dark:text-amber-400">{score.partial}</p><p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t('done_partial')}</p></div>
              <div><p className="text-3xl font-bold text-red-500 dark:text-red-400">{score.incorrect}</p><p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t('done_incorrect')}</p></div>
            </div>
          </div>

          {/* ネクストアクション */}
          {isHighScore && (
            <Link href="/library/import"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors">
              <span className="text-xl">🚀</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-300">フレーズを追加してレベルアップ！</p>
                <p className="text-xs text-emerald-400/70 mt-0.5">新しいテキストをインポートする</p>
              </div>
              <span className="text-emerald-400">›</span>
            </Link>
          )}
          {score.incorrect + score.partial > 0 && (
            <button onClick={() => load(true)}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors text-left">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-300">弱点を復習する</p>
                <p className="text-xs text-red-400/70 mt-0.5">間違えたフレーズを重点的に練習</p>
              </div>
              <span className="text-red-400">›</span>
            </button>
          )}

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {answers.map((a, i) => {
              const st: JudgeStatus = a.status ?? (a.is_correct ? 'correct' : 'incorrect')
              return (
                <div key={i} className={`rounded-xl p-3 border text-sm ${st === 'correct' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' : st === 'partial' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white">{a.phrase}</span>
                    <span className={`text-xs ${RESULT_CLS[st]}`}>
                      {t(`result_${st}` as 'result_correct' | 'result_partial' | 'result_incorrect')}
                    </span>
                  </div>
                  <p className="text-gray-500 dark:text-slate-400 text-xs mt-1">{t('quiz_your_answer')}{a.user_answer}</p>
                  {st !== 'correct' && <p className="text-gray-600 dark:text-slate-300 text-xs mt-0.5">{t('quiz_correct_answer')}{a.meaning_ja}</p>}
                </div>
              )
            })}
          </div>

          {saveState === 'saving' && (
            <p className="text-center text-xs text-gray-400 dark:text-slate-500 animate-pulse">記録を保存中...</p>
          )}
          {saveState === 'failed' && (
            <p className="text-center text-xs text-red-500 dark:text-red-400">記録の保存に失敗しました。ネットワーク状態を確認してください。</p>
          )}

          <div className="flex gap-2">
            <button onClick={() => load(false)} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors">{t('done_again')}</button>
            <button
              onClick={() => router.push('/history')}
              disabled={saveState === 'saving'}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                saveState === 'saving'
                  ? 'bg-gray-100 dark:bg-white/5 text-gray-300 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20'
              }`}
            >
              {saveState === 'saving' ? '保存中...' : t('done_history')}
            </button>
            <button
              onClick={() => handleShare(pct)}
              disabled={sharing}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                sharing
                  ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-slate-500 animate-pulse cursor-not-allowed'
                  : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20'
              }`}
              title="結果をシェア"
            >
              {sharing ? '生成中...' : '𝕏 シェア'}
            </button>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
          >
            {t('done_home')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-gray-900/95 backdrop-blur-sm">
        <div className="px-4 pt-3 pb-1 flex items-center justify-between max-w-lg mx-auto">
          <Link href="/" className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 text-2xl p-2 -ml-2">‹</Link>
          <div className="flex items-center gap-3">
            {isFocusMode && (
              <span className="text-xs bg-red-500/20 text-red-500 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">⚠ 弱点</span>
            )}
            <span className="text-xs text-emerald-500 dark:text-emerald-400 font-semibold">✓ {score.correct}</span>
            <span className="text-xs text-amber-500 dark:text-amber-400 font-semibold">△ {score.partial}</span>
            <span className="text-xs text-red-500 dark:text-red-400 font-semibold">✗ {score.incorrect}</span>
            <span className="text-xs text-gray-400 dark:text-slate-500">{answered + 1}/{total}</span>
            <LangToggle />
          </div>
        </div>
        <div className="px-4 pb-2 max-w-lg mx-auto">
          <Progress value={(answered / total) * 100} className="h-1" />
        </div>
      </div>

      <div className="px-4 pt-2 pb-10 max-w-lg mx-auto space-y-2">
        {current && (
          <>
            <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-center space-y-2">
              <div className="flex justify-center gap-2 flex-wrap">
                {current.usage_scene && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${SCENE_CLS[current.usage_scene]}`}>
                    {t(`scene_${current.usage_scene}` as 'scene_daily' | 'scene_technical' | 'scene_business' | 'scene_other')}
                  </span>
                )}
                {current.engineer_level && (
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${LEVEL_CLS[current.engineer_level]}`}>
                    {t(`level_${current.engineer_level}` as 'level_junior' | 'level_mid' | 'level_senior')}
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-wide break-words">{current.phrase}</p>
              {/* コンテキストヒント（設定 ON かつ original_context がある場合） */}
              {settings.contextHint && current.original_context && step === 'question' && (
                <p className="text-xs text-gray-500 dark:text-slate-400 italic bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2 leading-relaxed text-left">
                  &ldquo;{maskPhrase(current.original_context, current.phrase)}&rdquo;
                </p>
              )}

              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button onClick={() => speak(current.phrase, 'phrase')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${speaking === 'phrase' ? 'bg-blue-500/20 text-blue-500 dark:text-blue-400' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-white/20'}`}>
                  {t('quiz_speak_phrase')}
                </button>
                <SpeedSelector />
                <VoiceSelector />
              </div>
            </div>

            {step === 'question' && (
              <div className="space-y-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder={t('quiz_placeholder')}
                  style={{ fontSize: '16px' }}
                  className="w-full bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-2xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button onClick={handleSubmit} disabled={!answer.trim()}
                  className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:bg-blue-700">
                  {t('quiz_submit')}
                </button>
              </div>
            )}

            {step === 'judging' && (
              <p className="text-center text-gray-500 dark:text-slate-400 text-sm animate-pulse py-3">{t('quiz_judging')}</p>
            )}

            {step === 'result' && judgment && (() => {
              const status: JudgeStatus = judgment.status ?? (judgment.correct ? 'correct' : 'incorrect')
              const { cls, textCls } = STATUS_CLS[status]
              return (
                <>
                  <div className={`rounded-2xl p-3 text-center border ${cls}`}>
                    <p className={`text-base font-bold ${textCls}`}>
                      {t(`status_${status}` as 'status_correct' | 'status_partial' | 'status_incorrect')}
                    </p>
                    {judgment.feedback && <p className="text-xs text-slate-300 mt-0.5">{judgment.feedback}</p>}
                  </div>

                  <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-3 space-y-2">
                    <div>
                      <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">{t('quiz_correct_meaning')}</p>
                      <p className="text-gray-900 dark:text-white font-semibold text-sm">{current.meaning_ja}</p>
                    </div>
                    {current.original_context && (
                      <div className="border-t border-gray-100 dark:border-white/10 pt-2 space-y-1.5">
                        <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider">{t('quiz_usage_example')}</p>
                        <div className="flex items-start gap-2">
                          <p className="flex-1 text-sm text-gray-600 dark:text-slate-200 italic leading-relaxed">
                            &ldquo;{highlightPhrase(current.original_context, current.phrase)}&rdquo;
                          </p>
                          <button onClick={() => speak(current.original_context!, 'context')}
                            className={`flex-shrink-0 mt-0.5 px-2 py-1 rounded-full text-[10px] transition-colors ${speaking === 'context' ? 'bg-blue-500/20 text-blue-500 dark:text-blue-400' : 'bg-gray-100 dark:bg-white/10 text-gray-400 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-white/20'}`}>
                            🔊
                          </button>
                        </div>
                        {judgment.context_ja && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed bg-gray-50 dark:bg-white/5 rounded-xl px-3 py-2">
                            {judgment.context_ja}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
                          ※{' '}
                          <mark className="bg-amber-400/20 text-amber-600 dark:text-amber-300 not-italic rounded px-0.5 font-semibold">{current.phrase}</mark>
                          {' '}={' '}
                          <mark className="bg-amber-400/20 text-amber-600 dark:text-amber-300 not-italic rounded px-0.5">{current.meaning_ja}</mark>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* AI解説 */}
                  {!explanation && (
                    <button
                      onClick={handleExplain}
                      disabled={explaining}
                      className={`w-full py-2.5 rounded-2xl text-sm font-medium transition-colors border ${
                        explaining
                          ? 'border-amber-500/20 bg-amber-500/10 text-amber-500 dark:text-amber-400 animate-pulse'
                          : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-slate-200'
                      }`}
                    >
                      {explaining ? t('quiz_explaining') : t('quiz_explain')}
                    </button>
                  )}
                  {explanation && (
                    <div className="rounded-2xl border border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 p-3 space-y-1.5">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">💡 AI解説</p>
                      <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{explanation}</p>
                    </div>
                  )}

                  <button onClick={handleNext}
                    className="w-full py-3 rounded-2xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white font-bold text-sm hover:bg-gray-200 dark:hover:bg-white/20 transition-colors active:bg-gray-300 dark:active:bg-white/30">
                    {index + 1 >= total ? t('quiz_see_results') : t('quiz_next')}
                  </button>
                </>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}
