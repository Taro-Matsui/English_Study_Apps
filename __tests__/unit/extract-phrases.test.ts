import { describe, it, expect } from 'vitest'
import { parseExtractionResponse } from '@/lib/extract-phrases'

const phrase = (p: string) => ({
  phrase: p,
  pronunciation: 'テスト',
  meaning_ja: '意味',
  original_context: 'ctx',
  difficulty: 3,
  usage_scene: 'business',
  engineer_level: 'mid',
})

describe('parseExtractionResponse', () => {
  it('object形式: source(title/date/topics) と phrases を両方取り出す', () => {
    const raw = JSON.stringify({
      source: { title: 'スプリント計画会議', date: '2026-06-01', topics: ['スプリント計画', 'CI/CD'] },
      phrases: [phrase('circle back'), phrase('touch base')],
    })
    const r = parseExtractionResponse(raw)
    expect(r.phrases.map((p) => p.phrase)).toEqual(['circle back', 'touch base'])
    expect(r.meta).toEqual({ title: 'スプリント計画会議', date: '2026-06-01', topics: ['スプリント計画', 'CI/CD'] })
  })

  it('```json フェンス付きでもパースできる', () => {
    const raw = '```json\n' + JSON.stringify({ source: { title: 'T', date: null, topics: [] }, phrases: [phrase('spin up')] }) + '\n```'
    const r = parseExtractionResponse(raw)
    expect(r.phrases).toHaveLength(1)
    expect(r.meta?.title).toBe('T')
  })

  it('旧: 素の配列(sourceなし)でも phrases を取り、meta は null', () => {
    const raw = JSON.stringify([phrase('take a stab at')])
    const r = parseExtractionResponse(raw)
    expect(r.phrases).toHaveLength(1)
    expect(r.meta).toBeNull()
  })

  it('不正な日付は null に正規化する', () => {
    const raw = JSON.stringify({ source: { title: 'X', date: '6月1日', topics: [] }, phrases: [phrase('heads up')] })
    const r = parseExtractionResponse(raw)
    expect(r.meta?.date).toBeNull()
    expect(r.meta?.title).toBe('X')
  })

  it('非英語フレーズ(日本語混入)は除外する', () => {
    const raw = JSON.stringify({ source: { title: 'X', date: null, topics: [] }, phrases: [phrase('good phrase'), phrase('これは日本語')] })
    const r = parseExtractionResponse(raw)
    expect(r.phrases.map((p) => p.phrase)).toEqual(['good phrase'])
  })

  it('max_tokens切断で末尾が壊れても、完結したphraseを部分回復し source は best-effort', () => {
    // sourceは完結、phrases配列の途中で切断
    const truncated =
      '{"source":{"title":"会議録","date":"2026-06-02","topics":["計画"]},"phrases":[' +
      JSON.stringify(phrase('wrap up')) + ',' +
      JSON.stringify(phrase('align on')) + ',' +
      '{"phrase":"in the wee'  // ← 切断
    const r = parseExtractionResponse(truncated)
    expect(r.phrases.map((p) => p.phrase)).toEqual(['wrap up', 'align on'])
    expect(r.meta?.title).toBe('会議録')
    expect(r.meta?.date).toBe('2026-06-02')
  })

  it('phrases が空配列でも throw せず空で返す（正当な「抽出ゼロ」）', () => {
    const raw = JSON.stringify({ source: { title: 'X', date: null, topics: [] }, phrases: [] })
    const r = parseExtractionResponse(raw)
    expect(r.phrases).toEqual([])
  })

  it('title/date/topics がすべて空なら meta は null', () => {
    const raw = JSON.stringify({ source: { title: '', date: null, topics: [] }, phrases: [phrase('ok phrase')] })
    const r = parseExtractionResponse(raw)
    expect(r.meta).toBeNull()
  })

  it('素の空配列 [] は「正当な抽出ゼロ」として空で返す（throw しない・旧挙動維持）', () => {
    expect(parseExtractionResponse('[]')).toEqual({ phrases: [], meta: null })
    expect(parseExtractionResponse('  [ ]  ')).toEqual({ phrases: [], meta: null })
    expect(parseExtractionResponse('```json\n[]\n```')).toEqual({ phrases: [], meta: null })
  })

  it('完全なゴミ(JSON化不能・回復不能)は throw する', () => {
    expect(() => parseExtractionResponse('これはJSONではありません。ただの文章です。')).toThrow()
  })
})
