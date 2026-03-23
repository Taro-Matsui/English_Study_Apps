'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Plan = 'free' | 'starter' | 'pro'
type Interval = 'monthly' | 'yearly'

interface Subscription {
  plan: Plan
  status: string
  current_period_end: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

const PLAN_LABELS: Record<Plan, string> = { free: 'Free', starter: 'Starter', pro: 'Pro' }

const PLAN_PRICES: Record<Plan, Record<Interval, string>> = {
  free:    { monthly: '¥0', yearly: '¥0' },
  starter: { monthly: '¥180 / 月', yearly: '¥1,800 / 年' },
  pro:     { monthly: '¥480 / 月', yearly: '¥4,800 / 年' },
}

const PLANS: {
  key: Plan
  label: string
  priceKey: (interval: Interval) => string
  features: string[]
  highlight?: boolean
}[] = [
  {
    key: 'free',
    label: 'Free',
    priceKey: () => '',
    features: [
      'フレーズ累計 60 件まで',
      '1日 5 チャレンジ',
      'AI 判定（Haiku）',
      'Pick Streak カレンダー',
      'PWA 対応',
    ],
  },
  {
    key: 'starter',
    label: 'Starter',
    priceKey: (interval) => `starter_${interval}`,
    features: [
      'フレーズ月 300件 ＋ 繰越最大 100件',
      '1日 10 チャレンジ',
      'AI 判定 月 30回（Haiku）',
      'ピックアップ チャレンジ',
      'チャレンジ記録 詳細統計',
    ],
    highlight: true,
  },
  {
    key: 'pro',
    label: 'Pro',
    priceKey: (interval) => `pro_${interval}`,
    features: [
      'フレーズ無制限',
      '1日 10 チャレンジ',
      'AI 判定 無制限（Sonnet）',
      'SRS 優先出題（近日公開）',
      'Pick of the Week（近日公開）',
      '優先サポート',
    ],
  },
]

function BillingContent() {
  const searchParams = useSearchParams()
  const [sub, setSub] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [interval, setInterval] = useState<Interval>('monthly')
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const success = searchParams.get('success') === 'true'
  const canceled = searchParams.get('canceled') === 'true'

  useEffect(() => {
    fetch('/api/stripe/subscription')
      .then((r) => r.json())
      .then((data) => {
        setSub(data as Subscription)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleUpgrade(priceKey: string) {
    setCheckoutLoading(priceKey)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceKey }),
      })
      const text = await res.text()
      let data: { url?: string; error?: string }
      try { data = JSON.parse(text) } catch { data = { error: `HTTP ${res.status}: ${text.slice(0, 200)}` } }
      if (data.url) {
        window.location.href = data.url
      } else {
        setErrorMsg(data.error ?? 'エラーが発生しました')
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '通信エラーが発生しました')
    }
    setCheckoutLoading(null)
  }

  async function handlePortal() {
    setPortalLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const text = await res.text()
      let data: { url?: string; error?: string }
      try { data = JSON.parse(text) } catch { data = { error: `HTTP ${res.status}: ${text.slice(0, 200)}` } }
      if (data.url) {
        window.location.href = data.url
      } else {
        setErrorMsg(data.error ?? 'エラーが発生しました')
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : '通信エラーが発生しました')
    }
    setPortalLoading(false)
  }

  const currentPlan: Plan = sub?.plan ?? 'free'

  return (
    <div className="min-h-screen bg-amber-50 text-gray-900">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-amber-50/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 pt-3 pb-3 flex items-center gap-3 max-w-lg mx-auto">
          <Link href="/settings" className="text-gray-400 hover:text-gray-600 text-2xl p-2 -ml-2">‹</Link>
          <h1 className="flex-1 text-sm font-semibold">プラン・お支払い</h1>
        </div>
      </div>

      <div className="px-4 pt-5 pb-12 max-w-lg mx-auto space-y-6">

        {/* 成功・キャンセルメッセージ */}
        {success && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800">
            🎉 ご登録ありがとうございます！プランが有効になりました。
          </div>
        )}
        {canceled && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            決済をキャンセルしました。プランは変更されていません。
          </div>
        )}
        {errorMsg && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 break-all">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* 現在のプラン */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">現在のプラン</h2>
          <div className="bg-white rounded-xl border border-amber-100 p-4 flex items-center justify-between">
            {loading ? (
              <span className="text-sm text-gray-400">読み込み中...</span>
            ) : (
              <>
                <div>
                  <p className="font-semibold text-gray-900">
                    {PLAN_LABELS[currentPlan]}
                    {sub?.status === 'past_due' && (
                      <span className="ml-2 text-xs text-red-500 font-normal">（支払い失敗）</span>
                    )}
                  </p>
                  {sub?.current_period_end && currentPlan !== 'free' && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      次回更新: {new Date(sub.current_period_end).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-500">
                  {PLAN_PRICES[currentPlan].monthly}
                </span>
              </>
            )}
          </div>

          {/* サブスク管理ポータル（有料プランのみ） */}
          {!loading && currentPlan !== 'free' && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="w-full py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {portalLoading ? '移動中...' : '🔧 支払い方法・解約の管理'}
            </button>
          )}
        </section>

        {/* 月払い / 年払いトグル */}
        <section>
          <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1">
            <button
              onClick={() => setInterval('monthly')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                interval === 'monthly'
                  ? 'bg-amber-800 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              月払い
            </button>
            <button
              onClick={() => setInterval('yearly')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors relative ${
                interval === 'yearly'
                  ? 'bg-amber-800 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              年払い
              <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                interval === 'yearly' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'
              }`}>
                2ヶ月分お得
              </span>
            </button>
          </div>
        </section>

        {/* プラン比較 */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">プランを選ぶ</h2>

          {PLANS.map((plan) => {
            const isCurrent = plan.key === currentPlan
            const isHigher =
              (plan.key === 'starter' && currentPlan === 'free') ||
              (plan.key === 'pro' && (currentPlan === 'free' || currentPlan === 'starter'))
            const priceKey = plan.priceKey(interval)
            const isLoading = checkoutLoading === priceKey

            return (
              <div
                key={plan.key}
                className={`rounded-xl border p-4 space-y-3 ${
                  plan.highlight
                    ? 'border-amber-400 bg-white'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{plan.label}</p>
                      {plan.highlight && (
                        <span className="text-[10px] bg-amber-800 text-white px-2 py-0.5 rounded-full font-medium">
                          おすすめ
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                          現在のプラン
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {PLAN_PRICES[plan.key][interval]}
                    </p>
                    {plan.key !== 'free' && interval === 'yearly' && (
                      <p className="text-xs text-emerald-600 font-medium">
                        月払いより2ヶ月分お得
                      </p>
                    )}
                  </div>
                </div>

                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="text-emerald-500 flex-shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* アクションボタン */}
                {plan.key === 'free' ? (
                  <div className="h-0" />
                ) : isCurrent ? (
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="w-full py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {portalLoading ? '移動中...' : '管理・解約'}
                  </button>
                ) : isHigher ? (
                  <button
                    onClick={() => priceKey && handleUpgrade(priceKey)}
                    disabled={isLoading || !priceKey}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                      plan.highlight
                        ? 'bg-amber-800 text-white hover:bg-amber-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {isLoading ? '移動中...' : `${plan.label} にアップグレード`}
                  </button>
                ) : (
                  // 現在より下のプランはダウングレード（ポータルから）
                  <button
                    onClick={handlePortal}
                    disabled={portalLoading}
                    className="w-full py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {portalLoading ? '移動中...' : 'ダウングレード'}
                  </button>
                )}
              </div>
            )
          })}
        </section>

        {/* 補足 */}
        <p className="text-xs text-gray-400 text-center">
          クレジットカード決済 / Stripe で安全に処理されます。<br />
          いつでも解約可能です。日割り請求はありません。
        </p>

      </div>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-amber-50" />}>
      <BillingContent />
    </Suspense>
  )
}
