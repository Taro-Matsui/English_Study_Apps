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
import { openXShare, generateQuizResultImage, uploadShareImage } from '@/lib/share-image'
import { AdBanner } from '@/components/AdBanner'

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
  correct:   { cls: 'bg-emerald-50 border-emerald-300', textCls: 'text-emerald-700' },
  partial:   { cls: 'bg-amber-50 border-amber-300',     textCls: 'text-amber-700'   },
  incorrect: { cls: 'bg-red-50 border-red-300',         textCls: 'text-red-700'     },
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
    <Suspense fallback={<div className="min-h-screen bg-amber-50 flex items-center justify-center"><p className="text-gray-400 text-sm animate-pulse">読み込み中...</p></div>}>
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
  const [clipboardMsg, setClipboardMsg] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [explaining, setExplaining] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const questionStartTime = useRef<number>(0)
  const explainPhraseRef = useRef<string | null>(null) // 解説取得中のphrase_id（次問移動時に破棄）

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
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-full px-1.5 py-1">
      {VOICE_PRESETS.map(({ key, label }) => (
        <button key={key} onClick={() => setVoicePreset(key)}
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
            settings.voicePreset === key ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700'
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
      // partial / incorrect は解説を自動取得（correct はユーザーが任意で開ける）
      if (status !== 'correct') handleExplain()
    } catch { setStep('question') }
  }

  function handleSkip() {
    if (!current) return
    const responseTimeMs = Date.now() - questionStartTime.current
    const status: JudgeStatus = 'incorrect'
    setJudgment({ correct: false, status, feedback: '' })
    setScore((s) => ({ ...s, incorrect: s.incorrect + 1 }))
    setAnswers((prev) => [...prev, {
      phrase_id: current.id, phrase: current.phrase, meaning_ja: current.meaning_ja ?? '',
      user_answer: '（分かりません）', is_correct: false, ai_feedback: '',
      status, response_time_ms: responseTimeMs,
    }])
    speak(current.phrase, 'phrase')
    setStep('result')
    handleExplain()
  }

  async function handleExplain() {
    if (!current || explaining) return
    const phraseId = current.id
    explainPhraseRef.current = phraseId
    setExplaining(true)
    try {
      const res = await fetch('/api/quiz/explain', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase_id: phraseId,
          phrase: current.phrase,
          meaning_ja: current.meaning_ja,
          original_context: current.original_context ?? undefined,
        }),
      })
      const data: ExplainResponse = await res.json()
      // 取得完了前に次の問題へ進んでいた場合は破棄
      if (explainPhraseRef.current !== phraseId) return
      setExplanation(data.explanation || data.error || '解説を取得できませんでした')
    } catch {
      if (explainPhraseRef.current === phraseId) setExplanation('通信エラーが発生しました')
    }
    setExplaining(false)
  }

  function handleNext() {
    window.speechSynthesis?.cancel(); setSpeaking(null)
    setExplanation(null)
    explainPhraseRef.current = null
    const next = index + 1
    if (next >= total) {
      setStep('done')
      setSaveState('saving')
      // score は handleSubmit で既に更新済み（handleNext 呼び出し時点では最終スコア）
      const finalScore = score
      const finalPct = Math.round((finalScore.correct / total) * 100)
      fetch('/api/quiz/complete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
        .then((r) => r.json())
        .then((d) => {
          setSaveState(d.success ? 'saved' : 'failed')
          if (d.session_id) {
            setSessionId(d.session_id)
            // 【Safari対策】タブがフォアグラウンドにある今のうちにアップロード開始
            // window.open() 後は Safari がタブを suspend するためここで先行実行する
            generateQuizResultImage({
              pct: finalPct,
              correct: finalScore.correct,
              total,
              partial: finalScore.partial,
              incorrect: finalScore.incorrect,
              studyPurpose:     user?.user_metadata?.study_purpose     as string | undefined,
              studySubcategory: user?.user_metadata?.study_subcategory as string | undefined,
            })
              .then((blob) => uploadShareImage(blob, d.session_id))
              .catch(() => null)
          }
        })
        .catch(() => setSaveState('failed'))
      return
    }
    setIndex(next); setAnswer(''); setJudgment(null); setStep('question')
  }

  async function handleShare(pct: number) {
    if (sharing) return
    setSharing(true)
    try {
      const result = await openXShare({
        pct, correct: score.correct, total,
        partial: score.partial, incorrect: score.incorrect,
        studyPurpose:     user?.user_metadata?.study_purpose     as string | undefined,
        studySubcategory: user?.user_metadata?.study_subcategory as string | undefined,
        sessionId: sessionId ?? undefined,
      })
      if (result === 'copied') {
        setClipboardMsg(true)
        setTimeout(() => setClipboardMsg(false), 3000)
      }
    } finally { setSharing(false) }
  }

  const SpeedSelector = () => (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-full px-1.5 py-1">
      {(['slow', 'normal', 'fast'] as Speed[]).map((s) => (
        <button key={s} onClick={() => setSpeed(s)}
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-colors ${speed === s ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
          {t(`speed_${s}` as 'speed_fast' | 'speed_normal' | 'speed_slow')}
        </button>
      ))}
    </div>
  )

  if (step === 'loading') return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <p className="text-gray-400 text-sm animate-pulse">
        {isFocusMode ? '⚠️ 弱点フレーズを読み込み中...' : t('quiz_loading')}
      </p>
    </div>
  )

  if (step === 'empty') return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-4xl">📭</p>
      <p className="text-gray-500 text-sm">
        {isFocusMode ? '弱点フレーズが見つかりません。通常クイズに切り替えます。' : t('quiz_empty')}
      </p>
      {isFocusMode
        ? <Link href="/quiz" className="text-sm text-blue-600 hover:underline">通常クイズを開始</Link>
        : <Link href="/library/import" className="text-sm text-blue-600 hover:underline">{t('quiz_empty_link')}</Link>
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
      <div className="min-h-screen bg-amber-50 flex flex-col p-4">
        <div className="max-w-lg mx-auto w-full pt-8 space-y-5">
          <div className="text-center space-y-2">
            <p className="text-5xl">{grade}</p>
            <p className="text-base font-semibold text-gray-600">{motivationMsg}</p>
            <p className="text-5xl font-bold text-gray-900">{pct}<span className="text-2xl text-gray-400">%</span></p>
            <div className="flex justify-center gap-6 pt-2">
              <div><p className="text-3xl font-bold text-emerald-500">{score.correct}</p><p className="text-xs text-gray-400 mt-1">{t('done_correct')}</p></div>
              <div><p className="text-3xl font-bold text-amber-500">{score.partial}</p><p className="text-xs text-gray-400 mt-1">{t('done_partial')}</p></div>
              <div><p className="text-3xl font-bold text-red-500">{score.incorrect}</p><p className="text-xs text-gray-400 mt-1">{t('done_incorrect')}</p></div>
            </div>
          </div>

          {/* 広告 */}
          <AdBanner
            slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_QUIZ ?? ''}
            className="rounded-xl"
          />

          {/* ネクストアクション */}
          {isHighScore && (
            <Link href="/library/import"
              className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors">
              <span className="text-xl">🚀</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-300">フレーズを追加してレベルアップ！</p>
                <p className="text-xs text-emerald-400/70 mt-0.5">新しいフレーズをPickする</p>
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
                <div key={i} className={`rounded-xl p-3 border text-sm ${st === 'correct' ? 'bg-emerald-50 border-emerald-200' : st === 'partial' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{a.phrase}</span>
                    <span className={`text-xs ${RESULT_CLS[st]}`}>
                      {t(`result_${st}` as 'result_correct' | 'result_partial' | 'result_incorrect')}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-1">{t('quiz_your_answer')}{a.user_answer}</p>
                  {st !== 'correct' && <p className="text-gray-600 text-xs mt-0.5">{t('quiz_correct_answer')}{a.meaning_ja}</p>}
                </div>
              )
            })}
          </div>

          {saveState === 'saving' && (
            <p className="text-center text-xs text-gray-400 animate-pulse">記録を保存中...</p>
          )}
          {saveState === 'failed' && (
            <p className="text-center text-xs text-red-500">記録の保存に失敗しました。ネットワーク状態を確認してください。</p>
          )}
          {clipboardMsg && (
            <p className="text-center text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl py-2 px-3">
              📋 画像をクリップボードにコピーしました。Xの投稿画面で Ctrl+V / ⌘V で貼り付けてください。
            </p>
          )}

          <div className="flex gap-2">
            <button onClick={() => load(false)} className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors">{t('done_again')}</button>
            <button
              onClick={() => router.push('/history')}
              disabled={saveState === 'saving'}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                saveState === 'saving'
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {saveState === 'saving' ? '保存中...' : t('done_history')}
            </button>
            <button
              onClick={() => handleShare(pct)}
              disabled={sharing}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                sharing
                  ? 'bg-gray-100 text-gray-400 animate-pulse cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="結果をシェア"
            >
              {sharing ? '生成中...' : '𝕏 シェア'}
            </button>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm hover:bg-gray-200 transition-colors"
          >
            {t('done_home')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="sticky top-0 z-10 bg-amber-50/95 backdrop-blur-sm">
        <div className="px-4 pt-3 pb-1 flex items-center justify-between max-w-lg mx-auto">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-3xl p-3 -ml-3 flex items-center justify-center">‹</Link>
          <div className="flex items-center gap-3">
            {isFocusMode && (
              <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full font-medium">⚠ 弱点</span>
            )}
            <span className="text-xs text-emerald-500 font-semibold">✓ {score.correct}</span>
            <span className="text-xs text-amber-500 font-semibold">△ {score.partial}</span>
            <span className="text-xs text-red-500 font-semibold">✗ {score.incorrect}</span>
            <span className="text-xs text-gray-400">{answered + 1}/{total}</span>
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
            <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center space-y-2">
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
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-wide break-words">{current.phrase}</p>
              {/* コンテキストヒント（設定 ON かつ original_context がある場合） */}
              {settings.contextHint && current.original_context && step === 'question' && (
                <p className="text-xs text-gray-500 italic bg-gray-50 rounded-xl px-3 py-2 leading-relaxed text-left">
                  &ldquo;{maskPhrase(current.original_context, current.phrase)}&rdquo;
                </p>
              )}

              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button onClick={() => speak(current.phrase, 'phrase')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${speaking === 'phrase' ? 'bg-blue-500/20 text-blue-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
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
                  id="quiz-answer"
                  name="quiz-answer"
                  type="text"
                  autoComplete="off"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder={t('quiz_placeholder')}
                  style={{ fontSize: '16px' }}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button onClick={handleSubmit} disabled={!answer.trim()}
                  className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:bg-blue-700">
                  {t('quiz_submit')}
                </button>
                <button onClick={handleSkip}
                  className="w-full py-2.5 rounded-2xl border border-gray-200 bg-white text-gray-400 text-sm hover:bg-gray-50 transition-colors">
                  分かりません
                </button>
              </div>
            )}

            {step === 'judging' && (
              <div className="flex flex-col items-center gap-2.5 py-4">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <p className="text-gray-400 text-sm">{t('quiz_judging')}</p>
              </div>
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
                    {judgment.feedback && <p className="text-xs text-gray-500 mt-0.5">{judgment.feedback}</p>}
                  </div>

                  <div className="bg-white border border-gray-200 rounded-2xl p-3 space-y-2">
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">{t('quiz_correct_meaning')}</p>
                      <p className="text-gray-900 font-semibold text-sm">{current.meaning_ja}</p>
                    </div>
                    {current.original_context && (
                      <div className="border-t border-gray-100 pt-2 space-y-1.5">
                        <p className="text-xs text-gray-400 uppercase tracking-wider">{t('quiz_usage_example')}</p>
                        <div className="flex items-start gap-2">
                          <p className="flex-1 text-sm text-gray-600 italic leading-relaxed">
                            &ldquo;{highlightPhrase(current.original_context, current.phrase)}&rdquo;
                          </p>
                          <button onClick={() => speak(current.original_context!, 'context')}
                            className={`flex-shrink-0 mt-0.5 px-2 py-1 rounded-full text-[10px] transition-colors ${speaking === 'context' ? 'bg-blue-500/20 text-blue-500' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                            🔊
                          </button>
                        </div>
                        {judgment.context_ja && (
                          <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-xl px-3 py-2">
                            {judgment.context_ja}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 leading-relaxed">
                          ※{' '}
                          <mark className="bg-amber-400/20 text-amber-600 not-italic rounded px-0.5 font-semibold">{current.phrase}</mark>
                          {' '}={' '}
                          <mark className="bg-amber-400/20 text-amber-600 not-italic rounded px-0.5">{current.meaning_ja}</mark>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* AI解説 */}
                  {!explanation && status === 'correct' && (
                    <button
                      onClick={handleExplain}
                      disabled={explaining}
                      className={`w-full py-2.5 rounded-2xl text-sm font-medium transition-colors border ${
                        explaining
                          ? 'border-amber-500/20 bg-amber-500/10 text-amber-500 animate-pulse'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                    >
                      {explaining ? t('quiz_explaining') : t('quiz_explain')}
                    </button>
                  )}
                  {!explanation && status !== 'correct' && explaining && (
                    <p className="text-center text-xs text-amber-500 animate-pulse py-1">
                      💡 {t('quiz_explaining')}
                    </p>
                  )}
                  {explanation && (
                    <div className="rounded-2xl border border-blue-500/20 bg-blue-50 p-3 space-y-1.5">
                      <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider">💡 AI解説</p>
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{explanation}</p>
                    </div>
                  )}

                  <button onClick={handleNext}
                    className="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors active:bg-gray-300">
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
