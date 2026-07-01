import { describe, it, expect } from 'vitest'
import { getJudgeModel } from '@/lib/plan-quota'

// getJudgeModel は純関数（DB非依存）。判定モデルの振り分けはコスト/品質に直結するため固定する。
// ※ quota 算出（checkPhraseQuota 等）は Supabase 結合のため Tier2 の route 統合テスト（vi.mock）で担保する。
describe('getJudgeModel', () => {
  it('Pro は Sonnet（精度優先）', () => {
    expect(getJudgeModel('pro')).toBe('claude-sonnet-4-6')
  })

  it('Free / Starter は Haiku（コスト最適化）', () => {
    expect(getJudgeModel('free')).toBe('claude-haiku-4-5-20251001')
    expect(getJudgeModel('starter')).toBe('claude-haiku-4-5-20251001')
  })
})
