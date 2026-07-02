import { describe, it, expect } from 'vitest'
import { getScene, LANDING_SCENE_SLUGS } from '@/lib/landing-scenes'
import { getSeedPhrases } from '@/lib/seed-phrases'

describe('landing-scenes', () => {
  it('全 slug が有効な seedKey に解決しフレーズが非空', () => {
    for (const slug of LANDING_SCENE_SLUGS) {
      const s = getScene(slug)!
      expect(s).toBeTruthy()
      expect(getSeedPhrases(s.seedKey).length).toBeGreaterThan(5)
    }
  })

  it('未知 slug は undefined', () => {
    expect(getScene('nope')).toBeUndefined()
  })

  it('slug に重複が無い', () => {
    expect(new Set(LANDING_SCENE_SLUGS).size).toBe(LANDING_SCENE_SLUGS.length)
  })

  it('title/description/h1 は SEO に足る長さ', () => {
    for (const slug of LANDING_SCENE_SLUGS) {
      const s = getScene(slug)!
      expect(s.title.length).toBeGreaterThan(10)
      expect(s.description.length).toBeGreaterThan(40)
      expect(s.h1.length).toBeGreaterThan(6)
      expect(s.intro.length).toBeGreaterThan(20)
    }
  })

  it('初弾3シーン(code-review/tech-conference/engineer-meeting)を含む', () => {
    expect(LANDING_SCENE_SLUGS).toEqual(
      expect.arrayContaining(['code-review', 'tech-conference', 'engineer-meeting'])
    )
  })
})
