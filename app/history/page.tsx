'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage, LangToggle } from '@/lib/i18n'
import { useSettings } from '@/lib/settings'
import { useAuth } from '@/lib/auth-context'
import { openXShare } from '@/lib/share-image'
import { formatTime, resolveIsDark } from '@/lib/utils'

interface AnswerRow {
  is_correct: boolean
  user_answer: string
  ai_feedback: string
  answered_at: string
  phrase_id: string
  phrases: {
    phrase: string
    meaning_ja: string
    original_context: string | null
    usage_scene: string | null
    engineer_level: string | null
    difficulty?: number
  } | null
}

interface Session {
  id: string
  completed_at: string
  total_questions: number
  correct_count: number
  quiz_answers: AnswerRow[]
}

interface DailyPoint { date: string; correct: number; total: number }
interface DiffPoint  { difficulty: number; correct: number; total: number }
interface ScenePoint { scene: string; correct: number; total: number }

interface HistoryData {
  sessions: Session[]
  daily_accuracy: DailyPoint[]
  by_difficulty: DiffPoint[]
  by_scene: ScenePoint[]
}


const DIFF_CLS: Record<number, string> = {
  1: 'text-emerald-600', 2: 'text-sky-600', 3: 'text-amber-600', 4: 'text-orange-600', 5: 'text-red-600',
}
const SCENE_LABELS: Record<string, string> = {
  daily: '日常', technical: '技術', business: 'ビジネス', other: 'その他',
}

export default function HistoryPage() {
  const { lang, t } = useLanguage()
  const { settings } = useSettings()
  const { user } = useAuth()
  const [data, setData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<string | null>(null)
  const [sharing, setSharing] = useState<string | null>(null)
  const [clipboardId, setClipboardId] = useState<string | null>(null)

  async function handleShareSession(ses: Session) {
    if (sharing) return
    setSharing(ses.id)
    try {
      const pct = ses.total_questions ? Math.round((ses.correct_count / ses.total_questions) * 100) : 0
      const copied = await openXShare({
        pct, correct: ses.correct_count, total: ses.total_questions,
        partial: 0, incorrect: ses.total_questions - ses.correct_count,
        theme: resolveIsDark(settings.colorTheme) ? 'dark' : 'light',
        studyPurpose: user?.user_metadata?.study_purpose as string | undefined,
      })
      if (copied) {
        setClipboardId(ses.id)
        setTimeout(() => setClipboardId(null), 3000)
      }
    } finally { setSharing(null) }
  }

  useEffect(() => {
    fetch('/api/history').then((r) => r.json()).then((d) => {
      if (d.sessions) setData(d)
      else setData({ sessions: Array.isArray(d) ? d : [], daily_accuracy: [], by_difficulty: [], by_scene: [] })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const sessions = data?.sessions ?? []
  const totalAnswered = sessions.reduce((s, ses) => s + ses.total_questions, 0)
  const totalCorrect = sessions.reduce((s, ses) => s + ses.correct_count, 0)
  const avgPct = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0

  const stats = [
    { label: t('history_total'), value: totalAnswered, unit: lang === 'ja' ? '問' : 'Q' },
    { label: t('history_correct_count'), value: totalCorrect, unit: lang === 'ja' ? '問' : 'Q' },
    { label: t('history_avg_score'), value: avgPct, unit: '%' },
  ]

  // 14日グラフ用: 有データの日を計算
  const daily = data?.daily_accuracy ?? []
  const maxTotal = Math.max(...daily.map((d) => d.total), 1)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-white/5 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 text-2xl p-2 -ml-2">‹</Link>
            <h1 className="text-base font-bold text-gray-800 dark:text-white">{t('history_title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-slate-400">
              {sessions.length} {t('history_sessions')}
            </span>
            <LangToggle />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {!loading && sessions.length > 0 && (
          <>
            {/* サマリー統計 */}
            <div className="grid grid-cols-3 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 text-center">
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{s.value}<span className="text-sm text-gray-400 dark:text-slate-400 ml-0.5">{s.unit}</span></p>
                  <p className="text-xs text-gray-400 dark:text-slate-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* 14日トレンドグラフ */}
            {daily.some((d) => d.total > 0) && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  直近14日の学習記録
                </p>
                <div className="flex items-end gap-1 h-20">
                  {daily.map((d) => {
                    const heightPct = d.total > 0 ? (d.total / maxTotal) * 100 : 0
                    const accuracy = d.total > 0 ? Math.round((d.correct / d.total) * 100) : null
                    const barColor = accuracy === null ? 'bg-gray-100 dark:bg-gray-700' :
                      accuracy >= 80 ? 'bg-emerald-400' :
                      accuracy >= 60 ? 'bg-amber-400' : 'bg-red-400'
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end justify-center" style={{ height: 64 }}>
                          <div
                            className={`w-full rounded-t-sm transition-all ${barColor}`}
                            style={{ height: `${Math.max(heightPct, d.total > 0 ? 8 : 0)}%` }}
                            title={accuracy !== null ? `${d.date.slice(5)}: ${accuracy}% (${d.correct}/${d.total})` : d.date.slice(5)}
                          />
                        </div>
                        <p className="text-[8px] text-gray-400 dark:text-slate-400 leading-none">
                          {d.date.slice(8)}
                        </p>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-3 mt-2">
                  {[
                    { color: 'bg-emerald-400', label: '≥80%' },
                    { color: 'bg-amber-400', label: '60-79%' },
                    { color: 'bg-red-400', label: '<60%' },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-sm ${l.color}`} />
                      <span className="text-[10px] text-gray-400 dark:text-slate-400">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 難易度別正解率 */}
            {(data?.by_difficulty.length ?? 0) > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">難易度別 正解率</p>
                {data!.by_difficulty.map((d) => {
                  const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0
                  return (
                    <div key={d.difficulty} className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-10 flex-shrink-0 ${DIFF_CLS[d.difficulty] ?? 'text-gray-600 dark:text-slate-400'}`}>
                        Lv.{d.difficulty}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-slate-400 w-10 text-right flex-shrink-0">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* シーン別 */}
            {(data?.by_scene.length ?? 0) > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">シーン別 正解率</p>
                {data!.by_scene.map((d) => {
                  const pct = d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0
                  return (
                    <div key={d.scene} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-slate-300 w-14 flex-shrink-0">
                        {SCENE_LABELS[d.scene] ?? d.scene}
                      </span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-400 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-slate-400 w-10 text-right flex-shrink-0">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />)
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-4xl">📊</p>
            <p className="text-sm text-gray-400 dark:text-slate-400">{t('history_empty')}</p>
            <Link href="/quiz" className="text-xs text-blue-500 hover:underline">{t('history_start_quiz')}</Link>
          </div>
        ) : (
          sessions.map((ses) => {
            const pct = ses.total_questions ? Math.round((ses.correct_count / ses.total_questions) * 100) : 0
            const isOpen = open === ses.id
            const dateStr = ses.completed_at ? formatTime(ses.completed_at) : '—'
            const summaryStr = lang === 'ja'
              ? `${ses.total_questions}問 / 正解 ${ses.correct_count}問`
              : `${ses.total_questions}Q / ${ses.correct_count} correct`
            return (
              <div key={ses.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : ses.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                      pct >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : pct >= 60 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                    }`}>
                      {pct}%
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{dateStr}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-400 mt-0.5">{summaryStr}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShareSession(ses) }}
                      disabled={sharing === ses.id}
                      className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                        sharing === ses.id
                          ? 'text-gray-300 dark:text-slate-600 animate-pulse'
                          : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                      title="Xにシェア"
                    >
                      𝕏
                    </button>
                    <span className={`text-gray-300 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                  </div>
                </button>

                {clipboardId === ses.id && (
                  <p className="px-5 py-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-t border-emerald-100 dark:border-emerald-500/20">
                    📋 クリップボードにコピーしました。Xで Ctrl+V / ⌘V で貼り付けてください。
                  </p>
                )}
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700/50">
                    {ses.quiz_answers.map((a, i) => (
                      <div key={i} className="px-5 py-3">
                        <div className="flex items-start gap-3">
                          <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                            a.is_correct ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                          }`}>
                            {a.is_correct ? '✓' : '✗'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-800 dark:text-white text-sm">{a.phrases?.phrase}</span>
                              {a.phrases?.usage_scene && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-slate-400">
                                  {t(`scene_${a.phrases.usage_scene}` as 'scene_daily' | 'scene_technical' | 'scene_business' | 'scene_other')}
                                </span>
                              )}
                              {a.phrases?.engineer_level && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-slate-400">
                                  {t(`level_${a.phrases.engineer_level}` as 'level_junior' | 'level_mid' | 'level_senior')}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                              {t('history_your_answer')}<span className="text-gray-700 dark:text-slate-200">{a.user_answer}</span>
                            </p>
                            {!a.is_correct && a.phrases?.meaning_ja && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{t('history_correct')}{a.phrases.meaning_ja}</p>
                            )}
                            {a.ai_feedback && (
                              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 italic">{a.ai_feedback}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
