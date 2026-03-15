'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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
  } | null
}

interface Session {
  id: string
  started_at: string
  total_questions: number
  correct_count: number
  quiz_answers: AnswerRow[]
}

const SCENE_LABEL: Record<string, string> = {
  daily: '日常会話', technical: 'テクニカル', business: 'ビジネス', other: 'その他',
}
const LEVEL_LABEL: Record<string, string> = { junior: '初級', mid: '中級', senior: '上級' }

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/history').then((r) => r.json()).then((d) => {
      setSessions(Array.isArray(d) ? d : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const totalAnswered = sessions.reduce((s, ses) => s + ses.total_questions, 0)
  const totalCorrect = sessions.reduce((s, ses) => s + ses.correct_count, 0)
  const avgPct = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-slate-400 hover:text-slate-600 text-lg">‹</Link>
            <h1 className="text-base font-bold text-slate-800">チャレンジ記録</h1>
          </div>
          <span className="text-xs text-slate-400">{sessions.length} セッション</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* 総合スタッツ */}
        {!loading && sessions.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '総回答数', value: totalAnswered, unit: '問' },
              { label: '正解数', value: totalCorrect, unit: '問' },
              { label: '平均正解率', value: avgPct, unit: '%' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-slate-800">{s.value}<span className="text-sm text-slate-400 ml-0.5">{s.unit}</span></p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-slate-200 animate-pulse" />)
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-4xl">📊</p>
            <p className="text-sm text-slate-400">まだ記録がありません</p>
            <Link href="/quiz" className="text-xs text-blue-500 hover:underline">クイズを始める →</Link>
          </div>
        ) : (
          sessions.map((ses) => {
            const pct = ses.total_questions ? Math.round((ses.correct_count / ses.total_questions) * 100) : 0
            const isOpen = open === ses.id
            return (
              <div key={ses.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : ses.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 text-left">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                      pct >= 80 ? 'bg-emerald-100 text-emerald-700' : pct >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {pct}%
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{formatDate(ses.started_at)}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {ses.total_questions}問 / 正解 {ses.correct_count}問
                      </p>
                    </div>
                  </div>
                  <span className={`text-slate-300 transition-transform ${isOpen ? 'rotate-90' : ''}`}>›</span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {ses.quiz_answers.map((a, i) => (
                      <div key={i} className="px-5 py-3">
                        <div className="flex items-start gap-3">
                          <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                            a.is_correct ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                          }`}>
                            {a.is_correct ? '✓' : '✗'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-800 text-sm">{a.phrases?.phrase}</span>
                              {a.phrases?.usage_scene && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                  {SCENE_LABEL[a.phrases.usage_scene] ?? a.phrases.usage_scene}
                                </span>
                              )}
                              {a.phrases?.engineer_level && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                  {LEVEL_LABEL[a.phrases.engineer_level] ?? a.phrases.engineer_level}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              回答: <span className="text-slate-700">{a.user_answer}</span>
                            </p>
                            {!a.is_correct && a.phrases?.meaning_ja && (
                              <p className="text-xs text-blue-600 mt-0.5">正解: {a.phrases.meaning_ja}</p>
                            )}
                            {a.ai_feedback && (
                              <p className="text-xs text-slate-400 mt-0.5 italic">{a.ai_feedback}</p>
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
