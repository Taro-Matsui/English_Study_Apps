import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  const db = getSupabaseAdmin()

  // 過去6ヶ月分のセッションを取得
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: sessions, error } = await db
    .from('quiz_sessions')
    .select('completed_at, total_questions, correct_count')
    .eq('user_id', user.id)
    .gte('completed_at', sixMonthsAgo.toISOString())
    .order('completed_at', { ascending: true })

  if (error) return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })

  // 日付ごとに集計
  const dateMap = new Map<string, { correct: number; total: number }>()
  ;(sessions ?? []).forEach((s) => {
    const date = (s.completed_at as string).slice(0, 10)
    const entry = dateMap.get(date) ?? { correct: 0, total: 0 }
    entry.correct += s.correct_count ?? 0
    entry.total   += s.total_questions ?? 0
    dateMap.set(date, entry)
  })

  const activity = Array.from(dateMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({ activity })
}
