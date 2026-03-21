'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'

interface ActivityDay {
  date: string
  correct: number
  total: number
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

/** その月のカレンダーセル（null = 空白パディング）を返す */
function getCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

/** アクティビティデータから現在ストリークと最長ストリークを計算 */
function computeStreaks(activity: ActivityDay[]): { current: number; longest: number } {
  if (!activity.length) return { current: 0, longest: 0 }

  const activeDates = new Set(activity.map((a) => a.date))

  // 現在ストリーク: 今日 or 昨日から遡る
  const todayUTC = new Date()
  todayUTC.setUTCHours(0, 0, 0, 0)
  let current = 0
  let started = false
  for (let i = 0; i < 400; i++) {
    const d = new Date(todayUTC)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (activeDates.has(key)) {
      current++
      started = true
    } else if (started) {
      break
    }
  }

  // 最長ストリーク
  const sorted = Array.from(activeDates).sort()
  let longest = 0
  let run = 0
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      run = 1
    } else {
      const prev = new Date(sorted[i - 1] + 'T00:00:00Z')
      const curr = new Date(sorted[i]  + 'T00:00:00Z')
      const diff = (curr.getTime() - prev.getTime()) / 86_400_000
      run = diff === 1 ? run + 1 : 1
    }
    if (run > longest) longest = run
  }

  return { current, longest }
}

export default function StreakPage() {
  const { lang } = useLanguage()
  const [activity, setActivity] = useState<ActivityDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/history/calendar')
      .then((r) => r.json())
      .then((d) => { setActivity(d.activity ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const activityMap = new Map(activity.map((a) => [a.date, a]))
  const { current: streak, longest } = computeStreaks(activity)
  const totalDays = activityMap.size

  // 表示する月: 今月 + 過去5ヶ月（新しい順）
  const now = new Date()
  const months: { year: number; month: number }[] = []
  for (let i = 0; i <= 5; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() })
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 pb-10">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-white/5 px-4 py-3">
        <div className="max-w-sm mx-auto flex items-center gap-2">
          <Link href="/" className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 text-2xl p-2 -ml-2">‹</Link>
          <h1 className="text-base font-bold text-gray-800 dark:text-white">
            {lang === 'ja' ? '学習カレンダー' : 'Study Calendar'}
          </h1>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 pt-5 space-y-4">
        {/* 統計カード */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-3 text-center">
            <p className="text-xl mb-0.5">🔥</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : streak}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight">
              {lang === 'ja' ? '現在の連続' : 'Current streak'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-3 text-center">
            <p className="text-xl mb-0.5">🏆</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : longest}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight">
              {lang === 'ja' ? '最長記録' : 'Best streak'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-3 text-center">
            <p className="text-xl mb-0.5">📅</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{loading ? '—' : totalDays}</p>
            <p className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5 leading-tight">
              {lang === 'ja' ? '総学習日数' : 'Total days'}
            </p>
          </div>
        </div>

        {/* 凡例 */}
        <div className="flex gap-4 justify-center">
          {[
            { color: 'bg-emerald-400', label: '≥80%' },
            { color: 'bg-amber-400',   label: '60–79%' },
            { color: 'bg-red-400',     label: '<60%' },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
              <span className="text-[10px] text-gray-400 dark:text-slate-500">{l.label}</span>
            </div>
          ))}
        </div>

        {/* カレンダー月別 */}
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-52 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))
        ) : (
          months.map(({ year, month }) => {
            const cells = getCalendarCells(year, month)
            return (
              <div key={`${year}-${month}`} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
                <p className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-3">
                  {year}年{MONTH_LABELS[month]}
                </p>

                {/* 曜日ヘッダー */}
                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map((w, i) => (
                    <div
                      key={w}
                      className={`text-center text-[10px] font-medium py-0.5 ${
                        i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400 dark:text-slate-500'
                      }`}
                    >
                      {w}
                    </div>
                  ))}
                </div>

                {/* 日セル */}
                <div className="grid grid-cols-7 gap-0.5">
                  {cells.map((day, idx) => {
                    if (!day) return <div key={`e-${idx}`} />

                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const act = activityMap.get(dateStr)
                    const isToday = dateStr === todayStr
                    const isFuture = dateStr > todayStr

                    let bgCls = 'bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-slate-400'
                    if (act && act.total > 0) {
                      const pct = (act.correct / act.total) * 100
                      bgCls = pct >= 80
                        ? 'bg-emerald-400 text-white'
                        : pct >= 60
                        ? 'bg-amber-400 text-white'
                        : 'bg-red-400 text-white'
                    }

                    return (
                      <div
                        key={dateStr}
                        title={act ? `${act.correct}/${act.total} 正解` : dateStr}
                        className={`aspect-square rounded-md flex items-center justify-center text-[11px] font-medium transition-all ${
                          isFuture ? 'opacity-25' : ''
                        } ${isToday ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-800' : ''} ${bgCls}`}
                      >
                        {day}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
