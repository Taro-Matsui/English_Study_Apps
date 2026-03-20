import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import { HomeContent } from '@/components/HomeContent'
import { unstable_cache } from 'next/cache'

export const dynamic = 'force-dynamic'

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

async function fetchStatsForUser(userId: string) {
  const db = getSupabaseAdmin()
  const [phraseRes, sourceRes, sessionRes] = await Promise.all([
    db.from('phrases').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('deleted_at', null),
    db.from('phrases').select('source_title').eq('user_id', userId).is('deleted_at', null).not('source_title', 'is', null),
    db.from('quiz_sessions').select('id, completed_at').eq('user_id', userId).order('completed_at', { ascending: false }).limit(60),
  ])
  const phraseCount = phraseRes.count ?? 0
  const sourceCount = new Set(
    (sourceRes.data ?? []).map((r: { source_title: string }) => r.source_title)
  ).size
  const sessions = sessionRes.data ?? []
  const { streak, today_done } = calcStreak(sessions.map((s: { completed_at: string }) => s.completed_at))

  let weakCount = 0
  const recentIds = sessions.slice(0, 20).map((s: { id: string }) => s.id)
  if (recentIds.length) {
    const { data: wrongs } = await db
      .from('quiz_answers').select('phrase_id').in('session_id', recentIds).eq('is_correct', false)
    if (wrongs) {
      const counts = new Map<string, number>()
      wrongs.forEach((a: { phrase_id: string }) => counts.set(a.phrase_id, (counts.get(a.phrase_id) ?? 0) + 1))
      weakCount = Array.from(counts.values()).filter((c) => c >= 2).length
    }
  }
  return { phraseCount, sourceCount, streak, todayDone: today_done, weakCount }
}

async function getStats() {
  try {
    const user = await getUser()
    if (!user) return { phraseCount: null, sourceCount: null, streak: 0, todayDone: false, weakCount: 0 }
    // 60秒キャッシュ。クイズ完了時に /api/quiz/complete が revalidateTag で即時無効化する。
    const cached = unstable_cache(fetchStatsForUser, ['stats', user.id], {
      revalidate: 60,
      tags: [`stats:${user.id}`],
    })
    return cached(user.id)
  } catch {
    return { phraseCount: null, sourceCount: null, streak: 0, todayDone: false, weakCount: 0 }
  }
}

export default async function Home() {
  const { phraseCount, sourceCount, streak, todayDone, weakCount } = await getStats()
  return (
    <HomeContent
      phraseCount={phraseCount}
      sourceCount={sourceCount}
      streak={streak}
      todayDone={todayDone}
      weakCount={weakCount}
    />
  )
}
