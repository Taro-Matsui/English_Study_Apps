import { describe, it, expect, beforeEach, vi } from 'vitest'
import { formatTime, resolveIsDark } from '@/lib/utils'

// ─── formatTime ───────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('ISO 文字列を M/D HH:MM 形式に変換する', () => {
    // JST オフセット付きで渡すことでタイムゾーン非依存
    const result = formatTime('2025-06-15T09:05:00+09:00')
    expect(result).toMatch(/^6\/15 \d{2}:\d{2}$/)
  })

  it('分が1桁のとき 0 パディングされる', () => {
    const result = formatTime('2025-06-15T09:05:00+09:00')
    expect(result).toMatch(/:\d{2}$/)
    expect(result.split(':')[1]).toBe('05')
  })

  it('時が1桁のとき 0 パディングされる', () => {
    const result = formatTime('2025-06-15T03:07:00+09:00')
    const timePart = result.split(' ')[1]
    expect(timePart).toMatch(/^\d{2}:\d{2}$/)
  })

  it('出力フォーマットが M/D HH:MM の正規表現に一致する', () => {
    const result = formatTime('2025-01-01T00:00:00+09:00')
    expect(result).toMatch(/^\d+\/\d+ \d{2}:\d{2}$/)
  })

  it('年末（12月31日）でも正しく動作する', () => {
    const result = formatTime('2025-12-31T23:59:00+09:00')
    expect(result).toMatch(/^\d+\/\d+ \d{2}:\d{2}$/)
    expect(result).toContain('23:59')
  })
})

// ─── resolveIsDark ────────────────────────────────────────────────────────────

describe('resolveIsDark', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false, // デフォルト: ライトモード
        media: query,
        onchange: null,
        addListener: vi.fn(),    // 非推奨だが MediaQueryList 型に必要
        removeListener: vi.fn(), // 非推奨だが MediaQueryList 型に必要
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('"dark" は常に true を返す', () => {
    expect(resolveIsDark('dark')).toBe(true)
  })

  it('"light" は常に false を返す', () => {
    expect(resolveIsDark('light')).toBe(false)
  })

  it('"system" かつ OS がライトモードのとき false を返す', () => {
    // beforeEach で matchMedia.matches = false を設定済み
    expect(resolveIsDark('system')).toBe(false)
  })

  it('"system" かつ OS がダークモードのとき true を返す', () => {
    vi.mocked(window.matchMedia).mockImplementation(() => ({
      matches: true,
      media: '',
      onchange: null,
      addListener: vi.fn(),    // 非推奨だが MediaQueryList 型に必要
      removeListener: vi.fn(), // 非推奨だが MediaQueryList 型に必要
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
    expect(resolveIsDark('system')).toBe(true)
  })

  it('"dark" は matchMedia に依存しない（window なしでも true）', () => {
    // matchMedia を呼ばずに true を返すことを確認
    const spy = vi.spyOn(window, 'matchMedia')
    expect(resolveIsDark('dark')).toBe(true)
    expect(spy).not.toHaveBeenCalled()
  })

  it('"light" は matchMedia に依存しない', () => {
    const spy = vi.spyOn(window, 'matchMedia')
    expect(resolveIsDark('light')).toBe(false)
    expect(spy).not.toHaveBeenCalled()
  })
})
