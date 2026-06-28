import { describe, it, expect } from 'vitest'
import { STEPS, nextReview, deriveGrade, isMastered } from '@/lib/srs'

// 基準日（UTC固定）でテストの決定性を確保
const TODAY = new Date('2026-06-28T00:00:00Z')
const base = { repetitions: 0, interval_days: 1, ease_factor: 2.5 }

// ─── nextReview: good（即答正解で昇格・拡張間隔）──────────────────

describe('nextReview / good', () => {
  it('新規(rep=0)→good で rep=1・interval=3(STEPS[1])・3日後due', () => {
    const r = nextReview(base, 'good', TODAY)
    expect(r.repetitions).toBe(1)
    expect(r.interval_days).toBe(3)
    expect(r.next_review_date).toBe('2026-07-01')
  })

  it('rep=2→good で rep=3・interval=16(STEPS[3])', () => {
    const r = nextReview({ ...base, repetitions: 2 }, 'good', TODAY)
    expect(r.repetitions).toBe(3)
    expect(r.interval_days).toBe(16)
  })

  it('末尾rep=5→good は rep=5で頭打ち・interval=70(STEPS[5])', () => {
    const r = nextReview({ ...base, repetitions: 5 }, 'good', TODAY)
    expect(r.repetitions).toBe(5)
    expect(r.interval_days).toBe(70)
  })

  it('ease_factor は変更しない', () => {
    const r = nextReview({ ...base, ease_factor: 2.5 }, 'good', TODAY)
    expect(r.ease_factor).toBe(2.5)
  })
})

// ─── nextReview: hard（据え置き・短め再提示）────────────────────

describe('nextReview / hard', () => {
  it('rep=0→hard は据え置き(rep=0)・interval=max(1,round(1*0.6))=1', () => {
    const r = nextReview(base, 'hard', TODAY)
    expect(r.repetitions).toBe(0)
    expect(r.interval_days).toBe(1)
  })

  it('rep=2→hard は据え置き(rep=2)・interval=round(7*0.6)=4', () => {
    const r = nextReview({ ...base, repetitions: 2 }, 'hard', TODAY)
    expect(r.repetitions).toBe(2)
    expect(r.interval_days).toBe(4)
    expect(r.next_review_date).toBe('2026-07-02')
  })
})

// ─── nextReview: again（誤答リセット・翌日再出題）────────────────

describe('nextReview / again', () => {
  it('rep=3→again は rep=0にリセット・interval=1・翌日due', () => {
    const r = nextReview({ ...base, repetitions: 3 }, 'again', TODAY)
    expect(r.repetitions).toBe(0)
    expect(r.interval_days).toBe(1)
    expect(r.next_review_date).toBe('2026-06-29')
  })
})

// ─── deriveGrade（status + 反応速度から grade 導出）─────────────

describe('deriveGrade', () => {
  it('correct かつ即答(<3500ms)→good', () => {
    expect(deriveGrade('correct', 1200, true)).toBe('good')
  })
  it('correct だが遅い(>=3500ms)→hard', () => {
    expect(deriveGrade('correct', 5000, true)).toBe('hard')
  })
  it('partial→hard', () => {
    expect(deriveGrade('partial', 1000, false)).toBe('hard')
  })
  it('incorrect→again', () => {
    expect(deriveGrade('incorrect', 800, false)).toBe('again')
  })
  it('status欠落時は is_correct で good/again にフォールバック', () => {
    expect(deriveGrade(null, null, true)).toBe('good')
    expect(deriveGrade(undefined, null, false)).toBe('again')
  })
})

// ─── isMastered（rep>=5 かつ interval>=35 で習熟）────────────────

describe('isMastered', () => {
  it('rep=5・interval=70 は習熟', () => {
    expect(isMastered({ repetitions: 5, interval_days: 70 })).toBe(true)
  })
  it('rep=3・interval=16 は未習熟', () => {
    expect(isMastered({ repetitions: 3, interval_days: 16 })).toBe(false)
  })
})

// ─── STEPS 定数の妥当性 ────────────────────────────────────────

describe('STEPS', () => {
  it('拡張間隔 [1,3,7,16,35,70]', () => {
    expect(STEPS).toEqual([1, 3, 7, 16, 35, 70])
  })
})

// ─── 境界網羅（回帰防止）──────────────────────────────────────

describe('nextReview / hard 各段の丸め', () => {
  it.each([
    [1, 2],  // round(3*0.6=1.8)=2
    [2, 4],  // round(7*0.6=4.2)=4
    [3, 10], // round(16*0.6=9.6)=10
    [4, 21], // round(35*0.6=21)=21
    [5, 42], // round(70*0.6=42)=42
  ])('rep=%i→hard で interval=%i（据え置き）', (rep, expectedInterval) => {
    const r = nextReview({ ...base, repetitions: rep }, 'hard', TODAY)
    expect(r.repetitions).toBe(rep)
    expect(r.interval_days).toBe(expectedInterval)
  })
})

describe('deriveGrade / 境界', () => {
  it('responseTimeMs ちょうど 3500ms は hard（<3500 のみ good）', () => {
    expect(deriveGrade('correct', 3500, true)).toBe('hard')
  })
  it('correct だが時間不明(null) は hard（速度未確認のため昇格しない）', () => {
    expect(deriveGrade('correct', null, true)).toBe('hard')
  })
  it('partial は is_correct=true でも status 優先で hard', () => {
    expect(deriveGrade('partial', 1000, true)).toBe('hard')
  })
})

describe('isMastered / 境界', () => {
  it('rep=5・interval=34 は未習熟（間隔不足）', () => {
    expect(isMastered({ repetitions: 5, interval_days: 34 })).toBe(false)
  })
  it('rep=5・interval=35 ちょうどは習熟', () => {
    expect(isMastered({ repetitions: 5, interval_days: 35 })).toBe(true)
  })
  it('rep=4・interval=70 は未習熟（末尾段未達）', () => {
    expect(isMastered({ repetitions: 4, interval_days: 70 })).toBe(false)
  })
})

describe('nextReview / again 後の復帰', () => {
  it('again でリセット後 good で rep=1・interval=3 に戻る', () => {
    const afterAgain = nextReview({ ...base, repetitions: 4 }, 'again', TODAY)
    expect(afterAgain.repetitions).toBe(0)
    const afterGood = nextReview(afterAgain, 'good', TODAY)
    expect(afterGood.repetitions).toBe(1)
    expect(afterGood.interval_days).toBe(3)
  })
})
