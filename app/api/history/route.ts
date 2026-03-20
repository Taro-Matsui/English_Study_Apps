import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  const db = getSupabaseAdmin()

  const { data: sessions, error } = await db
    .from('quiz_sessions')
    .select(`
      id, completed_at, total_questions, correct_count,
      quiz_answers (
        is_correct, user_answer, ai_feedback, answered_at,
        phrase_id,
        phrases ( phrase, meaning_ja, original_context, usage_scene, engineer_level, difficulty )
      )
    `)
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('[history]', error.message)
    return NextResponse.json({ error: '履歴の取得に失敗しました' }, { status: 500 })
  }

  const rows = sessions ?? []

  // 直近14日の日別正解率
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const dailyMap = new Map<string, { correct: number; total: number }>()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    dailyMap.set(d.toISOString().slice(0, 10), { correct: 0, total: 0 })
  }
  rows.forEach((ses) => {
    const key = (ses.completed_at as string).slice(0, 10)
    if (dailyMap.has(key)) {
      const entry = dailyMap.get(key)!
      entry.correct += ses.correct_count ?? 0
      entry.total += ses.total_questions ?? 0
    }
  })
  const daily_accuracy = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // 難易度別正解率
  type DiffMap = Map<number, { correct: number; total: number }>
  const byDiff: DiffMap = new Map()
  rows.forEach((ses) => {
    ;(ses.quiz_answers as { is_correct: boolean; phrases: { difficulty?: number } | null }[])?.forEach((a) => {
      const lv = a.phrases?.difficulty ?? 0
      if (!lv) return
      const e = byDiff.get(lv) ?? { correct: 0, total: 0 }
      e.total++
      if (a.is_correct) e.correct++
      byDiff.set(lv, e)
    })
  })
  const by_difficulty = Array.from(byDiff.entries())
    .map(([difficulty, v]) => ({ difficulty, ...v }))
    .sort((a, b) => a.difficulty - b.difficulty)

  // シーン別正解率
  type SceneMap = Map<string, { correct: number; total: number }>
  const byScene: SceneMap = new Map()
  rows.forEach((ses) => {
    ;(ses.quiz_answers as { is_correct: boolean; phrases: { usage_scene?: string | null } | null }[])?.forEach((a) => {
      const sc = a.phrases?.usage_scene
      if (!sc) return
      const e = byScene.get(sc) ?? { correct: 0, total: 0 }
      e.total++
      if (a.is_correct) e.correct++
      byScene.set(sc, e)
    })
  })
  const by_scene = Array.from(byScene.entries())
    .map(([scene, v]) => ({ scene, ...v }))
    .sort((a, b) => b.total - a.total)

  return NextResponse.json({ sessions: rows, daily_accuracy, by_difficulty, by_scene }, {
    headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
  })
}
