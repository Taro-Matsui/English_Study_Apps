import { ExtractedPhrase } from '@/types'

const SYSTEM_PROMPT = `あなたはエンジニアの英語学習を支援するAIです。
与えられた英語テキスト（エンジニアコミュニティの会話録・イベント記録など）から、
実務で頻出する英語フレーズを抽出・分析してください。

以下の基準でフレーズを選定してください：
- エンジニアリング文脈で頻出するコロケーション・イディオム・表現
- 単純な単語ではなく2語以上のフレーズ・表現
- ビジネス・技術コミュニケーションで実際に使われるもの
- 難易度：1（簡単）〜5（難しい）で評価

必ずJSON配列のみを返してください。説明文やコメントは不要です。`

const USER_PROMPT_TEMPLATE = (text: string) => `
以下のテキストから英語フレーズを30〜40個抽出してください。

テキスト:
---
${text}
---

以下のJSON配列形式で返してください：
[
  {
    "phrase": "フレーズ（英語）",
    "pronunciation": "発音記号（IPA）",
    "meaning_ja": "日本語での意味・説明",
    "original_context": "元テキストでの使用例文（英語原文をそのまま引用）",
    "difficulty": 3
  }
]`

export async function extractPhrasesWithClaude(text: string): Promise<ExtractedPhrase[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が設定されていません')

  // SDK の代わりに fetch を直接使用（Next.js 環境での接続問題を回避）
  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: USER_PROMPT_TEMPLATE(text) }],
    }),
  })
  } catch (err) {
    const cause = (err as NodeJS.ErrnoException)?.cause as NodeJS.ErrnoException | undefined
    const detail = cause?.code ?? cause?.message ?? (err instanceof Error ? err.message : String(err))
    console.error('[extract-phrases] fetch error:', detail)
    throw new Error(`Anthropic API への接続に失敗しました: ${detail}`)
  }

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Anthropic API エラー (${res.status}): ${body.slice(0, 300)}`)
  }

  const data = await res.json()
  const content = data.content?.[0]
  if (!content || content.type !== 'text') {
    throw new Error('Claude API から予期しないレスポンス形式が返されました')
  }

  // JSON部分を抽出（```json ... ``` ブロックにも対応）
  const raw: string = content.text.trim()
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\[[\s\S]*\])/)
  const jsonStr = jsonMatch ? jsonMatch[1] : raw

  let phrases: ExtractedPhrase[]
  try {
    phrases = JSON.parse(jsonStr)
  } catch {
    throw new Error(`レスポンスをJSONとして解析できませんでした:\n${raw.slice(0, 200)}`)
  }

  if (!Array.isArray(phrases)) throw new Error('レスポンスが配列ではありません')

  return phrases.filter((p) => p.phrase && p.meaning_ja)
}
