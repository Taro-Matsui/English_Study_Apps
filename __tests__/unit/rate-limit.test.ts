import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabaseMock } from '../helpers/supabase-mock'

const h = vi.hoisted(() => ({ client: null as unknown }))
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => h.client,
  getSupabase: () => h.client,
}))

import { isRateLimited } from '@/lib/rate-limit'

describe('isRateLimited（DB RPC 統合）', () => {
  beforeEach(() => { h.client = null })

  it('RPC が true を返したら制限超過（true）', async () => {
    const m = makeSupabaseMock({ rpc: { data: true, error: null } })
    h.client = m.client
    expect(await isRateLimited('u1', '/api/x', 10)).toBe(true)
    // 正しい引数で RPC を1回呼ぶ
    expect(m.calls.rpc?.[0]?.[0]).toBe('check_and_increment_rate_limit')
    const params = m.calls.rpc?.[0]?.[1] as Record<string, unknown>
    expect(params.p_user_id).toBe('u1')
    expect(params.p_endpoint).toBe('/api/x')
    expect(params.p_limit).toBe(10)
  })

  it('RPC が false を返したら未超過（false）', async () => {
    h.client = makeSupabaseMock({ rpc: { data: false, error: null } }).client
    expect(await isRateLimited('u1', '/api/x', 10)).toBe(false)
  })

  it('RPC エラー時はサービス継続優先で false（制限を適用しない）', async () => {
    h.client = makeSupabaseMock({ rpc: { data: null, error: { message: 'boom' } } }).client
    expect(await isRateLimited('u1', '/api/x', 10)).toBe(false)
  })

  it('例外時も false にフォールバック', async () => {
    h.client = { rpc: () => { throw new Error('down') } }
    expect(await isRateLimited('u1', '/api/x', 10)).toBe(false)
  })
})
