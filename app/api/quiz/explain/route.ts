import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { isRateLimited } from '@/lib/rate-limit'

export interface ExplainRequest {
  phrase: string
  meaning_ja: string
  original_context?: string
}

export interface ExplainResponse {
  explanation: string
  error?: string
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json<ExplainResponse>(
    { explanation: '', error: 'Unauthorized' },
    { status: 401 }
  )

  // レート制限: 1時間あたり20回
  if (await isRateLimited(user.id, 'quiz/explain', 20)) {
    return NextResponse.json<ExplainResponse>(
      { explanation: '', error: '1時間あたりの利用上限に達しました。しばらくしてから再度お試しください。' },
      { status: 429 }
    )
  }

  const body: ExplainRequest = await req.json()

  const sanitize = (s: string) => s.replace(/[\n\r]/g, ' ')
  const phrase = sanitize(String(body.phrase ?? '').slice(0, 200))
  const meaning_ja = sanitize(String(body.meaning_ja ?? '').slice(0, 500))
  const original_context = body.original_context
    ? sanitize(String(body.original_context).slice(0, 1000))
    : undefined

  if (!phrase) {
    return NextResponse.json<ExplainResponse>({ explanation: '', error: 'フレーズが空です' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json<ExplainResponse>(
      { explanation: '', error: 'ANTHROPIC_API_KEY が設定されていません' },
      { status: 500 }
    )
  }

  const contextLine = original_context ? `\n使用例文: "${original_context}"` : ''

  const prompt = `英語フレーズ「${phrase}」（意味: ${meaning_ja}）について、日本人エンジニアが深く理解できるよう以下を日本語で解説してください。${contextLine}

以下の構成でマークダウンなしの plain text で300字以内にまとめてください：

【語源・由来】一文で簡潔に
【ニュアンス】意味の微妙なニュアンスや使い方のポイント
【使う場面】エンジニアが実際に使うシーン（具体例）
【注意点】よくある誤解や間違い（あれば）`

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
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    const explanation: string = data.content?.[0]?.text?.trim() ?? ''

    if (!explanation) {
      return NextResponse.json<ExplainResponse>({ explanation: '', error: '解説を生成できませんでした' })
    }

    return NextResponse.json<ExplainResponse>({ explanation })
  } catch (err) {
    console.error('[quiz/explain] error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json<ExplainResponse>(
      { explanation: '', error: 'AI解説サービスが一時的に利用できません' },
      { status: 500 }
    )
  }
}
