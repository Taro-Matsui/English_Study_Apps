import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

function calcStreak(completedAts: string[]): { streak: number; today_done: boolean } {
  const todayStr = new Date().toISOString().slice(0, 10)
  const daySet = new Set(completedAts.map((d) => d.slice(0, 10)))
  const today_done = daySet.has(todayStr)

  let streak = 0
  const check = new Date()
  check.setUTCHours(0, 0, 0, 0)
  while (daySet.has(check.toISOString().slice(0, 10))) {
    streak++
    check.setUTCDate(check.getUTCDate() - 1)
  }
  return { streak, today_done }
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ phrase_count: 0, source_count: 0, streak: 0, today_done: false, weak_count: 0 })

  const db = getSupabaseAdmin()

  const [phraseRes, sourceRes, sessionRes] = await Promise.all([
    db.from('phrases').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null),
    db.from('phrases').select('source_title').eq('user_id', user.id).is('deleted_at', null).not('source_title', 'is', null),
    db.from('quiz_sessions').select('id, completed_at').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(60),
  ])

  const phraseCount = phraseRes.count ?? 0
  const sourceCount = new Set(
    (sourceRes.data ?? []).map((r: { source_title: string }) => r.source_title)
  ).size
  const sessions = sessionRes.data ?? []
  const { streak, today_done } = calcStreak(sessions.map((s: { completed_at: string }) => s.completed_at))

  // 弱点フレーズ: 直近20セッションで2回以上不正解のフレーズ数
  let weak_count = 0
  const recentIds = sessions.slice(0, 20).map((s: { id: string }) => s.id)
  if (recentIds.length) {
    const { data: wrongs } = await db
      .from('quiz_answers')
      .select('phrase_id')
      .in('session_id', recentIds)
      .eq('is_correct', false)
    if (wrongs) {
      const counts = new Map<string, number>()
      wrongs.forEach((a: { phrase_id: string }) => {
        counts.set(a.phrase_id, (counts.get(a.phrase_id) ?? 0) + 1)
      })
      weak_count = Array.from(counts.values()).filter((c) => c >= 2).length
    }
  }

  return NextResponse.json({ phrase_count: phraseCount, source_count: sourceCount, streak, today_done, weak_count })
}
