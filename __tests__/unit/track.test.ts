import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { track } from '@/lib/track'

describe('track', () => {
  afterEach(() => {
    // @ts-expect-error テスト用にクリーンアップ
    delete (globalThis as { window?: unknown }).window
  })

  it('window 未定義でも throw しない（SSR安全）', () => {
    // window が無い状態
    expect(() => track('lp_view')).not.toThrow()
  })

  it('window.dataLayer が未定義なら生成して push する', () => {
    ;(globalThis as { window?: unknown }).window = {} as Window & typeof globalThis
    track('demo_reached')
    const w = (globalThis as unknown as { window: { dataLayer: unknown[] } }).window
    expect(Array.isArray(w.dataLayer)).toBe(true)
    expect(w.dataLayer[0]).toEqual({ event: 'demo_reached' })
  })

  it('props を event と一緒に push する', () => {
    ;(globalThis as { window?: unknown }).window = { dataLayer: [] } as unknown as Window &
      typeof globalThis
    track('login_cta_click', { scene: 'code-review' })
    const w = (globalThis as unknown as { window: { dataLayer: unknown[] } }).window
    expect(w.dataLayer[0]).toEqual({ event: 'login_cta_click', scene: 'code-review' })
  })

  it('既存 dataLayer を破壊せず追記する', () => {
    ;(globalThis as { window?: unknown }).window = {
      dataLayer: [{ event: 'existing' }],
    } as unknown as Window & typeof globalThis
    track('lp_view')
    const w = (globalThis as unknown as { window: { dataLayer: unknown[] } }).window
    expect(w.dataLayer).toHaveLength(2)
    expect(w.dataLayer[1]).toEqual({ event: 'lp_view' })
  })
})
