import { describe, it, expect } from 'vitest'
import {
  resolveSeedKey,
  getSeedPhrases,
  buildSeedRows,
  COMMON_PHRASES,
  PURPOSE_PHRASES,
} from '@/lib/seed-phrases'

describe('resolveSeedKey', () => {
  it('subcategory が purpose より優先される', () => {
    expect(resolveSeedKey('business_engineer', 'meeting')).toBe('meeting')
  })

  it('subcategory が無ければ purpose を使う', () => {
    expect(resolveSeedKey('hobby_reading', null)).toBe('hobby_reading')
    expect(resolveSeedKey('hobby_reading', undefined)).toBe('hobby_reading')
  })

  it('未知キー・空は business_general にフォールバック', () => {
    expect(resolveSeedKey('nonsense', undefined)).toBe('business_general')
    expect(resolveSeedKey(null, null)).toBe('business_general')
    expect(resolveSeedKey(undefined, undefined)).toBe('business_general')
  })

  it('後方互換の旧 purpose キーも有効', () => {
    expect(resolveSeedKey('general', null)).toBe('general')
    expect(resolveSeedKey('reading', null)).toBe('reading')
  })
})

describe('getSeedPhrases', () => {
  it('COMMON_PHRASES を先頭に必ず含み、purpose 別フレーズを続ける', () => {
    const p = getSeedPhrases('business_general')
    expect(p.length).toBe(COMMON_PHRASES.length + PURPOSE_PHRASES.business_general.length)
    expect(p.slice(0, COMMON_PHRASES.length)).toEqual(COMMON_PHRASES)
  })

  it('全キーで COMMON を含み1件以上返す', () => {
    for (const key of Object.keys(PURPOSE_PHRASES) as (keyof typeof PURPOSE_PHRASES)[]) {
      const p = getSeedPhrases(key)
      expect(p.length).toBeGreaterThanOrEqual(COMMON_PHRASES.length)
    }
  })
})

describe('buildSeedRows（Free枠除外の根幹不変則）', () => {
  it('全行に source_type=System / source_title=初期フレーズ を付与する', () => {
    const rows = buildSeedRows('meeting', 'user-123', '2026-07-01')
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) {
      // この2つが崩れると plan-quota の Free 枠除外が効かなくなり課金枠が壊れる
      expect(r.source_type).toBe('System')
      expect(r.source_title).toBe('初期フレーズ')
      expect(r.user_id).toBe('user-123')
      expect(r.added_date).toBe('2026-07-01')
      expect(typeof r.phrase).toBe('string')
    }
  })
})
