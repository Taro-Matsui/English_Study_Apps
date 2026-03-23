import { getSupabaseAdmin } from './supabase'
import type { Plan } from './subscription'

export interface QuotaResult {
  allowed: boolean
  used: number
  limit: number
  reason?: 'phrase_limit' | 'feedback_limit' | 'practice_limit'
}

// Free プランのフレーズ上限
const FREE_PHRASE_LIMIT = 60
// Starter プランの月次フレーズ基本上限
const STARTER_PHRASE_BASE = 300
// Starter プランの繰越上限
const STARTER_ROLLOVER_MAX = 100
// Starter プランの月次フィードバック上限
const STARTER_FEEDBACK_LIMIT = 30
// 1日チャレンジ上限
const DAILY_PRACTICE_LIMIT: Record<Plan, number> = {
  free: 5,
  starter: 10,
  pro: 10,
}

/**
 * フレーズ上限チェック（import 開始前に呼ぶ）
 * - Free: 累計 60 件まで
 * - Starter: 今月 300件 ＋ 繰越（最大100件）まで
 * - Pro: 常に許可
 */
export async function checkPhraseQuota(userId: string, plan: Plan): Promise<QuotaResult> {
  if (plan === 'pro') {
    return { allowed: true, used: 0, limit: Infinity }
  }

  const supabase = getSupabaseAdmin()

  if (plan === 'free') {
    const { count } = await supabase
      .from('phrases')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)

    const used = count ?? 0
    const limit = FREE_PHRASE_LIMIT
    return {
      allowed: used < limit,
      used,
      limit,
      reason: used >= limit ? 'phrase_limit' : undefined,
    }
  }

  // Starter: 課金期間内のフレーズ数 + 繰越をチェック
  const { data: quota } = await supabase
    .from('plan_quotas')
    .select('rollover_phrases, period_start')
    .eq('user_id', userId)
    .single()

  const rollover = Math.min(quota?.rollover_phrases ?? 0, STARTER_ROLLOVER_MAX)
  const limit = STARTER_PHRASE_BASE + rollover

  // period_start がなければ月初を使う
  const periodStart = quota?.period_start
    ? new Date(quota.period_start).toISOString().slice(0, 10)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)

  const { count } = await supabase
    .from('phrases')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('deleted_at', null)
    .gte('added_date', periodStart)

  const used = count ?? 0
  return {
    allowed: used < limit,
    used,
    limit,
    reason: used >= limit ? 'phrase_limit' : undefined,
  }
}

/**
 * 1日チャレンジ上限チェック（quiz/complete 前に呼ぶ）
 * - Free: 5回/日
 * - Starter/Pro: 10回/日
 * 日付は JST（UTC+9）基準
 */
export async function checkDailyPracticeQuota(userId: string, plan: Plan): Promise<QuotaResult> {
  const supabase = getSupabaseAdmin()
  const limit = DAILY_PRACTICE_LIMIT[plan]

  // JST の今日の開始時刻（UTC で表現）
  const nowUtc = new Date()
  const jstOffset = 9 * 60 * 60 * 1000
  const todayJstStart = new Date(
    Math.floor((nowUtc.getTime() + jstOffset) / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000) - jstOffset
  )

  const { count } = await supabase
    .from('quiz_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .gte('completed_at', todayJstStart.toISOString())

  const used = count ?? 0
  return {
    allowed: used < limit,
    used,
    limit,
    reason: used >= limit ? 'practice_limit' : undefined,
  }
}

/**
 * Starter の月次フィードバック上限チェック（quiz/judge 前に呼ぶ）
 * - Starter: 月30回まで（Haiku モデル）
 * periodStart は plan_quotas.period_start か月初
 */
export async function checkMonthlyFeedbackQuota(
  userId: string,
  periodStart: Date
): Promise<QuotaResult> {
  const supabase = getSupabaseAdmin()

  // quiz_sessions を経由して quiz_answers の件数を取得
  // ai_feedback が空でない = AI 判定が実行された回答
  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('id')
    .eq('user_id', userId)
    .gte('completed_at', periodStart.toISOString())

  const sessionIds = (sessions ?? []).map((s) => s.id)

  let used = 0
  if (sessionIds.length > 0) {
    const { count } = await supabase
      .from('quiz_answers')
      .select('id', { count: 'exact', head: true })
      .in('session_id', sessionIds)
      .not('ai_feedback', 'is', null)
      .neq('ai_feedback', '')

    used = count ?? 0
  }

  const limit = STARTER_FEEDBACK_LIMIT
  return {
    allowed: used < limit,
    used,
    limit,
    reason: used >= limit ? 'feedback_limit' : undefined,
  }
}

/**
 * Judge に使うモデルをプランで決定
 * - Pro: Sonnet（精度優先）
 * - Free / Starter: Haiku（コスト最適化）
 */
export function getJudgeModel(plan: Plan): string {
  return plan === 'pro' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001'
}
