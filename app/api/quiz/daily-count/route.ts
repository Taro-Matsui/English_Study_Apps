import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/quiz/daily-count
 * 本日完了したクイズセッション数を返す（JST 基準）
 */
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()

  // JST の今日の開始時刻（UTC で表現）
  const nowUtc = new Date()
  const jstOffset = 9 * 60 * 60 * 1000
  const todayJstStart = new Date(
    Math.floor((nowUtc.getTime() + jstOffset) / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000) - jstOffset
  )

  const { count } = await supabase
    .from('quiz_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)
    .gte('completed_at', todayJstStart.toISOString())

  return NextResponse.json({ count: count ?? 0 })
}
