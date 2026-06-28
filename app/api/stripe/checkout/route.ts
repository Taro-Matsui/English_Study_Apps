import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase'

function getOrigin(req: NextRequest): string {
  const fwdHost = req.headers.get('x-forwarded-host')
  const fwdProto = req.headers.get('x-forwarded-proto') ?? 'https'
  if (fwdHost) return `${fwdProto}://${fwdHost}`
  return new URL(req.url).origin
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { priceKey, trial } = body as { priceKey?: string; trial?: boolean }

  // allowlist バリデーション — priceKey は 4 種のみ許可
  const priceMap: Record<string, string | undefined> = {
    starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    starter_yearly:  process.env.STRIPE_PRICE_STARTER_YEARLY,
    pro_monthly:     process.env.STRIPE_PRICE_PRO_MONTHLY,
    pro_yearly:      process.env.STRIPE_PRICE_PRO_YEARLY,
  }
  const priceId = priceKey ? priceMap[priceKey] : undefined

  if (!priceId) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
  }

  try {
    const stripe = getStripe()
    const supabase = getSupabaseAdmin()

    // ユーザーの全 subscription 行を取得。
    // subscriptions は user_id に UNIQUE が無く複数行ありうるため .single() は使わない
    // （複数行だと .single() がエラー→existingSub=null で再トライアルが通る穴になる）。
    const { data: subRows } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)

    let customerId = (subRows ?? []).find((r) => r.stripe_customer_id)?.stripe_customer_id as string | undefined
    const hasDbSubscription = (subRows ?? []).some((r) => !!r.stripe_subscription_id)

    // 14日 Pro トライアルは「過去に一度も契約/トライアルしていない」ユーザーのみ（再トライアル濫用防止）。
    const isProPrice = priceKey === 'pro_monthly' || priceKey === 'pro_yearly'
    let trialEligible = trial === true && isProPrice && !hasDbSubscription

    // customer が既にあれば Stripe を真実源として既存サブスク有無も確認（DB取りこぼし対策）。
    // 照会失敗時は安全側に倒してトライアルを付与しない。
    if (trialEligible && customerId) {
      try {
        const existing = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 1 })
        if (existing.data.length > 0) trialEligible = false
      } catch {
        trialEligible = false
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
    }

    const origin = getOrigin(req)

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      // トライアル: カードは取得し、14日後に自動課金（解約しなければ）
      ...(trialEligible ? { subscription_data: { trial_period_days: 14 } } : {}),
      success_url: `${origin}/settings/billing?success=true`,
      cancel_url: `${origin}/settings/billing?canceled=true`,
      metadata: { user_id: user.id },
      locale: 'ja',
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[stripe/checkout]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
