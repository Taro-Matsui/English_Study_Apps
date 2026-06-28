import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase'
import { log } from '@/lib/logger'
import type { Plan } from '@/lib/subscription'

// Stripe は raw body を署名検証に使うため bodyParser を無効化
export const dynamic = 'force-dynamic'

function getPlan(priceId: string | undefined): Plan {
  const proIds = [
    process.env.STRIPE_PRICE_PRO_MONTHLY,
    process.env.STRIPE_PRICE_PRO_YEARLY,
  ].filter(Boolean)
  const starterIds = [
    process.env.STRIPE_PRICE_STARTER_MONTHLY,
    process.env.STRIPE_PRICE_STARTER_YEARLY,
  ].filter(Boolean)
  if (priceId && proIds.includes(priceId)) return 'pro'
  if (priceId && starterIds.includes(priceId)) return 'starter'
  return 'free'
}

/**
 * Starter 課金期間更新時に繰越フレーズ数を計算・保存する
 * new_rollover = MIN(MAX(base + old_rollover - prev_period_used, 0), 100)
 */
async function updateStarterRollover(
  userId: string,
  prevPeriodStart: string | null,
  newPeriodStart: string
) {
  const supabase = getSupabaseAdmin()

  // 前月の plan_quotas を取得
  const { data: prevQuota } = await supabase
    .from('plan_quotas')
    .select('rollover_phrases, period_start')
    .eq('user_id', userId)
    .single()

  const oldRollover = prevQuota?.rollover_phrases ?? 0
  const periodStart = prevPeriodStart ?? prevQuota?.period_start

  let prevUsed = 0
  if (periodStart) {
    const { count } = await supabase
      .from('phrases')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .gte('added_date', periodStart)
      .lt('added_date', newPeriodStart)

    prevUsed = count ?? 0
  }

  const unused = Math.max(300 + oldRollover - prevUsed, 0)
  const newRollover = Math.min(unused, 100)

  await supabase.from('plan_quotas').upsert(
    {
      user_id: userId,
      rollover_phrases: newRollover,
      period_start: newPeriodStart,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'No stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break

      const userId = session.metadata?.user_id
      if (!userId || !session.subscription) break

      const subscription = await getStripe().subscriptions.retrieve(
        session.subscription as string
      )
      const priceId = subscription.items.data[0]?.price.id
      const plan = getPlan(priceId)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = subscription as any
      const periodEnd = sub.current_period_end as number | undefined
      const periodStart = sub.current_period_start as number | undefined

      const subRow = {
        user_id: userId,
        stripe_subscription_id: subscription.id,
        stripe_customer_id: session.customer as string,
        plan,
        status: subscription.status,
        current_period_end: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      }
      // 1ユーザー1行を維持する。onConflict に依存しない update-then-insert にすることで
      // migration 018(user_id UNIQUE) の適用前後どちらでも安全に動く。
      // - 018前: user_id に UNIQUE が無いので onConflict:'user_id' は使えない
      // - 018後: 旧 onConflict:'stripe_subscription_id' だと再契約時 insert が user_id 重複で失敗
      // 既存行があれば更新、無ければ挿入（再契約は既存行を上書き）。
      const { data: existingRow } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
      if (existingRow) {
        await supabase.from('subscriptions').update(subRow).eq('user_id', userId)
      } else {
        await supabase.from('subscriptions').insert(subRow)
      }

      // Starter: plan_quotas を初期化
      if (plan === 'starter' && periodStart) {
        const newPeriodStart = new Date(periodStart * 1000).toISOString().slice(0, 10)
        await supabase.from('plan_quotas').upsert(
          {
            user_id: userId,
            rollover_phrases: 0,
            period_start: newPeriodStart,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
      }
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const priceId = subscription.items.data[0]?.price.id
      const plan = getPlan(priceId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = subscription as any
      const periodEnd = sub.current_period_end as number | undefined
      const periodStart = sub.current_period_start as number | undefined

      // user_id を stripe_subscription_id から特定
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('user_id, current_period_end')
        .eq('stripe_subscription_id', subscription.id)
        .single()

      await supabase
        .from('subscriptions')
        .update({
          plan,
          status: subscription.status,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)

      // Starter: 課金期間が更新されたら繰越を再計算
      if (plan === 'starter' && existingSub?.user_id && periodStart) {
        const newPeriodStart = new Date(periodStart * 1000).toISOString().slice(0, 10)
        const prevPeriodStart = existingSub.current_period_end
          ? new Date(new Date(existingSub.current_period_end).getTime() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10)
          : null
        await updateStarterRollover(existingSub.user_id, prevPeriodStart, newPeriodStart)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription

      // チャーン分析: 解約理由を記録（Stripe のキャンセルフローが収集した場合のみ値が入る）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cd = (subscription as any).cancellation_details
      log({
        level: 'info',
        endpoint: '/api/stripe/webhook',
        message: 'subscription_canceled',
        detail: {
          stripe_subscription_id: subscription.id,
          reason: cd?.reason ?? null,
          feedback: cd?.feedback ?? null,
          comment: cd?.comment ?? null,
        },
      })

      await supabase
        .from('subscriptions')
        .update({
          plan: 'free',
          status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id)
      break
    }

    case 'invoice.payment_failed': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = event.data.object as any
      const invoiceSubId = invoice.subscription as string | null
      if (!invoiceSubId) break

      await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', invoiceSubId)
      break
    }

    default:
      // 未処理イベントは無視（200 を返して Stripe に再送させない）
      break
  }

  return NextResponse.json({ received: true })
}
