import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabaseMock } from '../helpers/supabase-mock'

const h = vi.hoisted(() => ({ client: null as unknown, user: null as unknown }))
vi.mock('@/lib/supabase', () => ({ getSupabaseAdmin: () => h.client, getSupabase: () => h.client }))
vi.mock('@/lib/auth', () => ({ getUser: async () => h.user }))
vi.mock('@/lib/logger', () => ({ log: vi.fn() }))

import { POST } from '@/app/api/admin/save/route'

function reqOf(body: unknown) {
  return new Request('http://localhost/api/admin/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}
const phrase = (p: string, extra: Record<string, unknown> = {}) => ({
  phrase: p, pronunciation: 'x', meaning_ja: 'y', original_context: 'z',
  difficulty: 3, usage_scene: 'business', engineer_level: 'mid', ...extra,
})

describe('POST /api/admin/save（統合・ST）', () => {
  beforeEach(() => { h.client = makeSupabaseMock({}).client; h.user = { id: 'user-1' } })

  it('未ログインは 401', async () => {
    h.user = null
    const res = await POST(reqOf({ phrases: [phrase('a')], source_type: 'その他', source_title: 't' }))
    expect(res.status).toBe(401)
  })

  it('フレーズ空は 400', async () => {
    const res = await POST(reqOf({ phrases: [], source_type: 'その他', source_title: 't' }))
    expect(res.status).toBe(400)
  })

  it('allowlist 外の source_type は 400（DB を触らない）', async () => {
    const m = makeSupabaseMock({}); h.client = m.client
    const res = await POST(reqOf({ phrases: [phrase('a')], source_type: 'BadType', source_title: 't' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('source_type')
    expect(m.calls.from).toBeUndefined()
  })

  it('201件以上は 400（DoS 上限）', async () => {
    const many = Array.from({ length: 201 }, (_, i) => phrase(`p${i}`))
    const res = await POST(reqOf({ phrases: many, source_type: 'その他', source_title: 't' }))
    expect(res.status).toBe(400)
  })

  it('既存は update・新規は insert に振り分け、件数を返す', async () => {
    // 既存 'gamma'（小文字比較で 'Gamma' と一致）→ update / 'alpha','beta' → insert
    const m = makeSupabaseMock({
      tables: {
        phrases: [
          { data: [{ id: 'g1', phrase: 'gamma' }], error: null }, // select existing
          { data: [{ id: 'a1' }, { id: 'b1' }], error: null },     // insert().select()
          { error: null },                                          // update gamma
        ],
      },
    })
    h.client = m.client
    const res = await POST(reqOf({
      phrases: [phrase('alpha'), phrase('beta'), phrase('Gamma')],
      source_type: '議事録', source_title: '会議',
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.inserted_count).toBe(2)
    expect(body.updated_count).toBe(1)
  })

  it('buildRow: 不正な usage_scene/engineer_level は other/mid にフォールバック', async () => {
    const m = makeSupabaseMock({
      tables: {
        phrases: [
          { data: [], error: null },            // select existing（無し）
          { data: [{ id: 'x1' }], error: null }, // insert().select()
        ],
      },
    })
    h.client = m.client
    await POST(reqOf({
      phrases: [phrase('alpha', { usage_scene: 'invalid', engineer_level: 'wizard' })],
      source_type: 'その他', source_title: 't',
    }))
    const insertedRows = m.calls.insert?.[0]?.[0] as Array<Record<string, unknown>>
    expect(insertedRows).toHaveLength(1)
    expect(insertedRows[0].usage_scene).toBe('other')
    expect(insertedRows[0].engineer_level).toBe('mid')
    expect(insertedRows[0].source_type).toBe('その他')
  })
})
