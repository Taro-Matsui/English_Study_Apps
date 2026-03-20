import { NextRequest, NextResponse } from 'next/server'
import { checkDemoRateLimit, getClientIp } from '@/lib/demo-rate-limit'

interface DemoJudgeRequest {
  phrase: string
  user_answer: string
  meaning_ja: string
}

interface DemoJudgeResponse {
  correct: boolean
  status: 'correct' | 'partial' | 'incorrect'
  feedback: string
  error?: string
}

/** 正規化: 全角→半角、句読点除去、小文字化 */
function normalize(s: string): string {
  return s.trim()
    .toLowerCase()
    .replace(/[、。　！？!?,. ・]/g, '')
    .replace(/[\uff01-\uff60]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (checkDemoRateLimit(ip, 'demo/judge', 30)) {
    return NextResponse.json<DemoJudgeResponse>(
      { correct: false, status: 'incorrect', feedback: '', error: 'しばらくしてから再度お試しください' },
      { status: 429 }
    )
  }

  const body: DemoJudgeRequest = await req.json()
  const sanitize = (s: string) => String(s ?? '').replace(/[\n\r]/g, ' ')
  const phrase = sanitize(body.phrase).slice(0, 200)
  const user_answer = sanitize(body.user_answer).slice(0, 500)
  const meaning_ja = sanitize(body.meaning_ja).slice(0, 500)

  if (!user_answer.trim()) {
    return NextResponse.json<DemoJudgeResponse>({ correct: false, status: 'incorrect', feedback: '回答を入力してください' })
  }

  // ローカル完全一致チェック
  if (normalize(user_answer) === normalize(meaning_ja)) {
    return NextResponse.json<DemoJudgeResponse>({ correct: true, status: 'correct', feedback: '完全一致' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json<DemoJudgeResponse>(
      { correct: false, status: 'incorrect', feedback: '', error: 'サービスが一時的に利用できません' },
      { status: 500 }
    )
  }

  const prompt = `フレーズ: "${phrase}"
正解の意味: "${meaning_ja}"
ユーザーの回答: "${user_answer}"

以下を行ってください：
1. ユーザーの回答を以下の3段階で評価する:
   - "correct": 正解の核心を正しく理解している（完全一致不要）
   - "partial": 方向性は合っているが重要な要素が不足・不正確
   - "incorrect": 正解と大きく異なる、または見当違い
2. 判定理由またはヒントを20字以内で作成する

以下のJSONのみを返してください（説明不要）：
{"status": "correct", "feedback": "理由を一言（20字以内）"}`

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
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    const text: string = data.content?.[0]?.text?.trim() ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    const status: 'correct' | 'partial' | 'incorrect' =
      parsed?.status === 'correct' ? 'correct' :
      parsed?.status === 'partial' ? 'partial' : 'incorrect'

    if (parsed?.status) {
      return NextResponse.json<DemoJudgeResponse>({
        correct: status === 'correct',
        status,
        feedback: parsed.feedback ?? '',
      })
    }
    return NextResponse.json<DemoJudgeResponse>({ correct: false, status: 'incorrect', feedback: '判定できませんでした' })
  } catch {
    return NextResponse.json<DemoJudgeResponse>(
      { correct: false, status: 'incorrect', feedback: '', error: 'AI判定が一時的に利用できません' },
      { status: 500 }
    )
  }
}
