import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUserSubscription } from '@/lib/subscription'

/**
 * GET /api/phrases/count
 * ユーザーのフレーズ数とクォータ情報を返す
 * import ページのクォータ表示に使用
 */
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getSupabaseAdmin()
  const sub = await getUserSubscription(user.id)
  const plan = sub.plan

  if (plan === 'pro') {
    return NextResponse.json({ plan, count: 0, limit: null, rollover: 0 })
  }

  // フレーズ数を取得
  const { count } = await supabase
    .from('phrases')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (plan === 'free') {
    return NextResponse.json({ plan, count: count ?? 0, limit: 60, rollover: 0 })
  }

  // Starter: 期間内のフレーズ数 + 繰越
  const { data: quota } = await supabase
    .from('plan_quotas')
    .select('rollover_phrases, period_start')
    .eq('user_id', user.id)
    .single()

  const rollover = Math.min(quota?.rollover_phrases ?? 0, 100)
  const limit = 300 + rollover

  const periodStart = quota?.period_start
    ? quota.period_start
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const { count: monthlyCount } = await supabase
    .from('phrases')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .gte('added_date', periodStart)

  return NextResponse.json({ plan, count: monthlyCount ?? 0, limit, rollover })
}
