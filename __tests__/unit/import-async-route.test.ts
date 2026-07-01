import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabaseMock } from '../helpers/supabase-mock'

const h = vi.hoisted(() => ({
  client: null as unknown,
  user: null as unknown,
  quota: { allowed: true, used: 0, limit: 60 } as { allowed: boolean; used: number; limit: number },
}))
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: () => h.client, getSupabase: () => h.client }))
vi.mock('@/lib/auth', () => ({ getUser: async () => h.user }))
vi.mock('@/lib/subscription', () => ({
  getUserSubscription: async () => ({
    plan: 'free', status: 'active', current_period_end: null,
    stripe_customer_id: null, stripe_subscription_id: null,
  }),
}))
vi.mock('@/lib/plan-quota', () => ({ checkPhraseQuota: async () => h.quota }))
vi.mock('@/lib/logger', () => ({ log: vi.fn() }))
// 抽出は guard パスでは呼ばれない。import 時の安全のためスタブ
vi.mock('@/lib/extract-phrases', () => ({ extractPhrasesWithClaude: vi.fn(async () => ({ phrases: [], meta: null })) }))

import { POST } from '@/app/api/admin/import-async/route'

function jsonReq(body: unknown) {
  return new Request('http://localhost/api/admin/import-async', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}

describe('POST /api/admin/import-async（ガード・ST）', () => {
  beforeEach(() => {
    h.client = makeSupabaseMock({}).client
    h.user = { id: 'u1' }
    h.quota = { allowed: true, used: 0, limit: 60 }
  })

  it('未ログインは 401', async () => {
    h.user = null
    const res = await POST(jsonReq({ text: 'x'.repeat(200) }))
    expect(res.status).toBe(401)
  })

  it('フレーズ上限超過は 403（upgrade フラグ付き）', async () => {
    h.quota = { allowed: false, used: 60, limit: 60 }
    const res = await POST(jsonReq({ text: 'x'.repeat(200) }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.upgrade).toBe(true)
  })

  it('処理中ジョブがあれば 429（同時実行制御）', async () => {
    h.client = makeSupabaseMock({
      tables: { import_jobs: { data: [{ id: 'running1' }], error: null } },
    }).client
    const res = await POST(jsonReq({ text: 'x'.repeat(200) }))
    expect(res.status).toBe(429)
  })
})
