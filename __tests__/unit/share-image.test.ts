import { describe, it, expect } from 'vitest'
import { getShareText } from '@/lib/share-image'

const base = { pct: 70, correct: 7, total: 10, partial: 1, incorrect: 2 }

// ─── getShareText ─────────────────────────────────────────────────────────────

describe('getShareText', () => {
  it('ヘッダー行 "【Reel】クイズ完了 📊" が含まれる', () => {
    expect(getShareText(base)).toContain('【Reel】クイズ完了 📊')
  })

  it('スコアと問題数が正しく埋め込まれる', () => {
    expect(getShareText(base)).toContain('70% 正解（7/10問）')
  })

  it('0% 境界値', () => {
    const text = getShareText({ pct: 0, correct: 0, total: 10, partial: 0, incorrect: 10 })
    expect(text).toContain('0% 正解（0/10問）')
  })

  it('100% 境界値', () => {
    const text = getShareText({ pct: 100, correct: 10, total: 10, partial: 0, incorrect: 0 })
    expect(text).toContain('100% 正解（10/10問）')
  })

  it('#英語学習 #フレーズ学習 が必ず含まれる', () => {
    expect(getShareText(base)).toContain('#英語学習 #フレーズ学習')
  })

  // study_purpose 別ハッシュタグ（5ケース一括検証）
  it.each([
    ['meeting',   '#ミーティング英語'],
    ['review',    '#コードレビュー英語'],
    ['reading',   '#技術文書英語'],
    ['interview', '#面接英語'],
    ['general',   '#ビジネス英語'],
  ])('studyPurpose="%s" のとき %s が追加される', (purpose, expectedTag) => {
    const text = getShareText({ ...base, studyPurpose: purpose })
    expect(text).toContain(expectedTag)
  })

  it('未知の studyPurpose は追加タグなし', () => {
    const text = getShareText({ ...base, studyPurpose: 'unknown_xyz' })
    // #英語学習 #フレーズ学習 の行で終わること
    const lines = text.split('\n')
    const tagLine = lines[lines.length - 1]
    expect(tagLine).toBe('#英語学習 #フレーズ学習')
  })

  it('studyPurpose 未指定は追加タグなし', () => {
    const text = getShareText({ ...base })
    const lines = text.split('\n')
    const tagLine = lines[lines.length - 1]
    expect(tagLine).toBe('#英語学習 #フレーズ学習')
  })

  it('study_purpose ありのとき基本タグ＋カテゴリタグの順になる', () => {
    const text = getShareText({ ...base, studyPurpose: 'meeting' })
    const tagLine = text.split('\n').at(-1)!
    expect(tagLine).toBe('#英語学習 #フレーズ学習 #ミーティング英語')
  })

  it('"Reel — 実際の会話から学ぶ英語フレーズ" が含まれる', () => {
    expect(getShareText(base)).toContain('Reel — 実際の会話から学ぶ英語フレーズ')
  })
})
