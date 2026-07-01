import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSupabaseMock } from '../helpers/supabase-mock'

const h = vi.hoisted(() => ({ client: null as unknown }))
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: () => h.client,
  getSupabase: () => h.client,
}))

import { getJudgeModel, checkPhraseQuota } from '@/lib/plan-quota'

// getJudgeModel は純関数（DB非依存）。判定モデルの振り分けはコスト/品質に直結するため固定する。
describe('getJudgeModel', () => {
  it('Pro は Sonnet（精度優先）', () => {
    expect(getJudgeModel('pro')).toBe('claude-sonnet-4-6')
  })
  it('Free / Starter は Haiku（コスト最適化）', () => {
    expect(getJudgeModel('free')).toBe('claude-haiku-4-5-20251001')
    expect(getJudgeModel('starter')).toBe('claude-haiku-4-5-20251001')
  })
})

describe('checkPhraseQuota（Supabase 結合・ST）', () => {
  beforeEach(() => { h.client = null })

  it('Pro は常に許可・上限 Infinity で DB を叩かない', async () => {
    const m = makeSupabaseMock({})
    h.client = m.client
    const r = await checkPhraseQuota('u1', 'pro')
    expect(r).toEqual({ allowed: true, used: 0, limit: Infinity })
    expect(m.calls.from).toBeUndefined() // クエリ発行なし
  })

  it('Free: 枠内なら許可し、System シード除外に .or（三値論理）を使う（.neq 単独の罠を回避）', async () => {
    const m = makeSupabaseMock({ tables: { phrases: { count: 5, error: null } } })
    h.client = m.client
    const r = await checkPhraseQuota('u1', 'free')
    expect(r.allowed).toBe(true)
    expect(r.used).toBe(5)
    expect(r.limit).toBe(60)
    // 回帰防止: NULL 行も落とす .neq 単独ではなく .or を使っている
    expect(m.calls.or?.[0]?.[0]).toBe('source_type.is.null,source_type.neq.System')
    expect(m.calls.neq).toBeUndefined()
  })

  it('Free: 上限到達で拒否（reason=phrase_limit）', async () => {
    h.client = makeSupabaseMock({ tables: { phrases: { count: 60, error: null } } }).client
    const r = await checkPhraseQuota('u1', 'free')
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('phrase_limit')
  })

  it('Starter: 上限 = 300 + 繰越（rollover は最大100にクランプ）', async () => {
    // rollover_phrases=200 → 100 にクランプ、limit=400
    const m = makeSupabaseMock({
      tables: {
        plan_quotas: { data: { rollover_phrases: 200, period_start: '2026-07-01' }, error: null },
        phrases: { count: 350, error: null },
      },
    })
    h.client = m.client
    const r = await checkPhraseQuota('u1', 'starter')
    expect(r.limit).toBe(400)
    expect(r.used).toBe(350)
    expect(r.allowed).toBe(true)
    // Starter はシード除外に .neq、期間で .gte を使う
    expect(m.calls.neq?.some((a) => a[0] === 'source_type' && a[1] === 'System')).toBe(true)
    expect(m.calls.gte?.some((a) => a[0] === 'added_date')).toBe(true)
  })
})
