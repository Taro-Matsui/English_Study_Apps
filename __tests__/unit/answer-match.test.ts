import { describe, it, expect } from 'vitest'
import { normalizeAnswer, isLocalCorrect } from '@/lib/answer-match'

// ─── normalizeAnswer ────────────────────────────────────────────────────────

describe('normalizeAnswer', () => {
  it('前後の空白を除去し小文字化する', () => {
    expect(normalizeAnswer('  Hello  ')).toBe('hello')
  })

  it('句読点・中黒・記号を除去する', () => {
    expect(normalizeAnswer('事前の通知、予告。')).toBe('事前の通知予告')
  })

  it('全角英数字を半角に変換する', () => {
    expect(normalizeAnswer('Ｈｅｌｌｏ')).toBe('hello')
  })
})

// ─── isLocalCorrect ─────────────────────────────────────────────────────────

describe('isLocalCorrect', () => {
  const NOTICE = '事前の通知・予告。相手に前もって知らせること。'

  // R1: 完全一致（正規化後）
  it('正規化後に完全一致すれば true（大小・空白・記号無視）', () => {
    expect(isLocalCorrect(' 事前の通知・予告。相手に前もって知らせること ', NOTICE)).toBe(true)
  })

  it('全角入力でも英語フレーズの意味に完全一致すれば true', () => {
    expect(isLocalCorrect('Ｈｅｌｌｏ', 'hello')).toBe(true)
  })

  // R2: 区切り要素の完全一致
  it('意味を区切り文字で分割した要素のいずれかに完全一致すれば true', () => {
    expect(isLocalCorrect('予告', NOTICE)).toBe(true)
  })

  it('先頭要素に完全一致すれば true', () => {
    expect(isLocalCorrect('事前の通知', NOTICE)).toBe(true)
  })

  it('1文字の区切り要素には一致させない（誤判定防止）', () => {
    // 「可・不可」を分割した1文字要素「可」だけでは正解にしない
    expect(isLocalCorrect('可', '可・不可')).toBe(false)
  })

  // R3: 実質的な部分包含
  it('意味の中に含まれる4文字以上の連続部分なら true', () => {
    expect(isLocalCorrect('前もって知らせる', NOTICE)).toBe(true)
  })

  it('3文字以下の短い部分一致は誤判定防止のため false', () => {
    expect(isLocalCorrect('通知', '事前の通知に関する細かな取り決めの一覧')).toBe(false)
  })

  // 否定ケース
  it('全く無関係な回答は false', () => {
    expect(isLocalCorrect('野球の練習', NOTICE)).toBe(false)
  })

  it('空文字は false', () => {
    expect(isLocalCorrect('', NOTICE)).toBe(false)
  })
})
