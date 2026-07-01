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
// 抽出は fire-and-forget の processJob 内。応答検証には不要なのでスタブで解決させる
vi.mock('@/lib/extract-phrases', () => ({ extractPhrasesWithClaude: vi.fn(async () => ({ phrases: [], meta: null })) }))

import { POST } from '@/app/api/admin/import-async/route'

function jsonReq(body: unknown) {
  return new Request('http://localhost/api/admin/import-async', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}
function rawReq(contentType: string, body = '') {
  return new Request('http://localhost/api/admin/import-async', {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  }) as never
}

describe('POST /api/admin/import-async（統合・ST）', () => {
  beforeEach(() => {
    h.client = makeSupabaseMock({}).client
    h.user = { id: 'u1' }
    h.quota = { allowed: true, used: 0, limit: 60 }
  })

  // ── ガード ──
  it('未ログインは 401', async () => {
    h.user = null
    expect((await POST(jsonReq({ text: 'x'.repeat(200) }))).status).toBe(401)
  })

  it('フレーズ上限超過は 403（upgrade フラグ付き）', async () => {
    h.quota = { allowed: false, used: 60, limit: 60 }
    const res = await POST(jsonReq({ text: 'x'.repeat(200) }))
    expect(res.status).toBe(403)
    expect((await res.json()).upgrade).toBe(true)
  })

  it('処理中ジョブがあれば 429（同時実行制御）', async () => {
    h.client = makeSupabaseMock({ tables: { import_jobs: { data: [{ id: 'running1' }], error: null } } }).client
    expect((await POST(jsonReq({ text: 'x'.repeat(200) }))).status).toBe(429)
  })

  // ── 入力検証 ──
  it('テキストが短すぎる（100文字未満）は 400', async () => {
    h.client = makeSupabaseMock({ tables: { import_jobs: { data: [], error: null } } }).client
    expect((await POST(jsonReq({ text: 'short' }))).status).toBe(400)
  })

  it('Content-Type 不正は 400', async () => {
    h.client = makeSupabaseMock({ tables: { import_jobs: { data: [], error: null } } }).client
    expect((await POST(rawReq('text/plain', 'hello'))).status).toBe(400)
  })

  // ── URL モードの SSRF / プロトコル検証（セキュリティ不変則）──
  it('プライベート/ループバックホストの URL は 403（SSRF 対策）', async () => {
    h.client = makeSupabaseMock({ tables: { import_jobs: { data: [], error: null } } }).client
    for (const url of ['http://localhost/x', 'http://127.0.0.1/x', 'http://192.168.0.1/x', 'http://169.254.169.254/latest']) {
      const res = await POST(jsonReq({ url }))
      expect(res.status).toBe(403)
    }
  })

  it('http/https 以外のプロトコルは 400', async () => {
    h.client = makeSupabaseMock({ tables: { import_jobs: { data: [], error: null } } }).client
    expect((await POST(jsonReq({ url: 'ftp://example.com/x' }))).status).toBe(400)
  })

  // ── 成功パス（テキスト貼り付け）──
  it('正当なテキストはジョブを作成し 200 + job_id を返す', async () => {
    const m = makeSupabaseMock({
      tables: {
        import_jobs: [
          { data: [], error: null },                      // running-job チェック（無し）
          { data: { id: 'job-1' }, error: null },          // insert().select('id').single()
        ],
      },
    })
    h.client = m.client
    const res = await POST(jsonReq({ text: 'a'.repeat(150), sourceTitle: 'My Notes' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.job_id).toBe('job-1')
    // ジョブは processing / user 紐付け / ユーザー由来タイトルで作成される
    const inserted = m.calls.insert?.[0]?.[0] as Record<string, unknown>
    expect(inserted.status).toBe('processing')
    expect(inserted.user_id).toBe('u1')
    expect(inserted.source_name).toBe('My Notes')
  })
})
