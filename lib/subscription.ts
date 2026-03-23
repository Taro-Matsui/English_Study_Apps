import { getSupabaseAdmin } from './supabase'

export type Plan = 'free' | 'starter' | 'pro'
export type SubStatus = 'active' | 'canceled' | 'past_due' | 'trialing'

export interface Subscription {
  plan: Plan
  status: SubStatus
  current_period_end: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

const FREE_SUB: Subscription = {
  plan: 'free',
  status: 'active',
  current_period_end: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
}

export async function getUserSubscription(userId: string): Promise<Subscription> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end, stripe_customer_id, stripe_subscription_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return FREE_SUB

  // canceled / past_due は free 扱い
  const isActive = data.status === 'active' || data.status === 'trialing'
  return {
    plan: isActive ? (data.plan as Plan) : 'free',
    status: data.status as SubStatus,
    current_period_end: data.current_period_end,
    stripe_customer_id: data.stripe_customer_id,
    stripe_subscription_id: data.stripe_subscription_id,
  }
}

export const PLAN_LABELS: Record<Plan, string> = {
  free:    'Free',
  starter: 'Starter',
  pro:     'Pro',
}

export const PLAN_PRICES: Record<Plan, string> = {
  free:    '¥0',
  starter: '¥180 / 月',
  pro:     '¥480 / 月',
}
