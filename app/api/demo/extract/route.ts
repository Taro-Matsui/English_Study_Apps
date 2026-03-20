import { NextRequest, NextResponse } from 'next/server'
import { checkDemoRateLimit, getClientIp } from '@/lib/demo-rate-limit'
import { ExtractedPhrase } from '@/types'

const DEMO_TEXT_MAX = 3000

interface DemoExtractResponse {
  phrases?: ExtractedPhrase[]
  error?: string
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (checkDemoRateLimit(ip, 'demo/extract', 5)) {
    return NextResponse.json<DemoExtractResponse>(
      { error: 'しばらくしてから再度お試しください（1時間あたり5回まで）' },
      { status: 429 }
    )
  }

  const body = await req.json()
  const text = String(body.text ?? '').slice(0, DEMO_TEXT_MAX)

  if (text.trim().length < 50) {
    return NextResponse.json<DemoExtractResponse>(
      { error: 'テキストが短すぎます（50文字以上貼り付けてください）' },
      { status: 400 }
    )
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json<DemoExtractResponse>(
      { error: 'サービスが一時的に利用できません' },
      { status: 500 }
    )
  }

  const prompt = `以下の英語テキストからエンジニアの実務で役立つ英語フレーズを最大10個抽出してください。

テキスト:
---
${text}
---

以下のJSON配列形式のみを返してください（説明不要）：
[
  {
    "phrase": "フレーズ（英語）",
    "meaning_ja": "日本語での意味",
    "original_context": "元テキストでの使用例（最大80文字）",
    "difficulty": 2,
    "usage_scene": "daily|technical|business|other のいずれか",
    "engineer_level": "junior|mid|senior のいずれか"
  }
]`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    const raw: string = data.content?.[0]?.text?.trim() ?? ''
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\[[\s\S]*\])/)
    const jsonStr = jsonMatch ? jsonMatch[1] : raw

    let phrases: ExtractedPhrase[]
    try {
      phrases = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json<DemoExtractResponse>({ error: 'フレーズの抽出に失敗しました。別のテキストをお試しください。' })
    }

    if (!Array.isArray(phrases) || phrases.length === 0) {
      return NextResponse.json<DemoExtractResponse>({ error: '英語フレーズが見つかりませんでした。英語テキストを入力してください。' })
    }

    // pronunciation は demo では不要なので除外
    const clean = phrases
      .filter((p) => p.phrase && p.meaning_ja)
      .slice(0, 10)
      .map((p) => ({ ...p, pronunciation: '' }))

    return NextResponse.json<DemoExtractResponse>({ phrases: clean })
  } catch {
    return NextResponse.json<DemoExtractResponse>(
      { error: 'AI抽出サービスが一時的に利用できません' },
      { status: 500 }
    )
  }
}
