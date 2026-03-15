import { NextRequest, NextResponse } from 'next/server'

export interface JudgeRequest {
  phrase: string
  user_answer: string
  meaning_ja: string
}

export interface JudgeResponse {
  correct: boolean
  feedback: string
  error?: string
}

export async function POST(req: NextRequest) {
  const body: JudgeRequest = await req.json()
  const { phrase, user_answer, meaning_ja } = body

  if (!user_answer?.trim()) {
    return NextResponse.json<JudgeResponse>({ correct: false, feedback: '回答を入力してください' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json<JudgeResponse>(
      { correct: false, feedback: '', error: 'ANTHROPIC_API_KEY が設定されていません' },
      { status: 500 }
    )
  }

  const prompt = `フレーズ: "${phrase}"
正解の意味: "${meaning_ja}"
ユーザーの回答: "${user_answer}"

ユーザーの回答が正解の意味と概ね一致しているか判定してください。
完全一致でなくても、核心的な意味を理解していれば正解としてください。

以下のJSONのみを返してください（説明不要）：
{"correct": true, "feedback": "正解の理由を一言（20字以内）"}
または
{"correct": false, "feedback": "ヒントを一言（20字以内）"}`

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
        max_tokens: 64,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    const text: string = data.content?.[0]?.text?.trim() ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    if (parsed && typeof parsed.correct === 'boolean') {
      return NextResponse.json<JudgeResponse>({ correct: parsed.correct, feedback: parsed.feedback ?? '' })
    }
    // fallback
    return NextResponse.json<JudgeResponse>({ correct: false, feedback: '判定できませんでした' })
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー'
    return NextResponse.json<JudgeResponse>(
      { correct: false, feedback: '', error: message },
      { status: 500 }
    )
  }
}
