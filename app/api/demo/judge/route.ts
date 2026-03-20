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

/** 正規化: 全角→半角、句読点・スペース除去、小文字化 */
function normalize(s: string): string {
  return s.trim()
    .toLowerCase()
    .replace(/[、。　！？!?,.\s・]/g, '')
    .replace(/[\uff01-\uff60]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  if (checkDemoRateLimit(ip, 'demo/judge', 20)) {
    return NextResponse.json<DemoJudgeResponse>(
      { correct: false, status: 'incorrect', feedback: '', error: 'しばらくしてから再度お試しください' },
      { status: 429 }
    )
  }

  const body: DemoJudgeRequest = await req.json()
  const sanitize = (s: string) => String(s ?? '').replace(/[\n\r]/g, ' ')
  const phrase    = sanitize(body.phrase).slice(0, 200)
  const user_answer = sanitize(body.user_answer).slice(0, 500)
  const meaning_ja  = sanitize(body.meaning_ja).slice(0, 500)

  if (!user_answer.trim()) {
    return NextResponse.json<DemoJudgeResponse>({ correct: false, status: 'incorrect', feedback: '回答を入力してください' })
  }

  const a = normalize(user_answer)
  const m = normalize(meaning_ja)

  // ローカル完全一致・高類似 → API不要
  if (a === m) {
    return NextResponse.json<DemoJudgeResponse>({ correct: true, status: 'correct', feedback: '完全一致！' })
  }
  if ((m.includes(a) && a.length >= m.length * 0.6) || (a.includes(m) && m.length >= a.length * 0.6)) {
    return NextResponse.json<DemoJudgeResponse>({ correct: true, status: 'correct', feedback: '正解！' })
  }

  // あいまい → Haiku で判定
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // Haiku 不可の場合は文字類似度でフォールバック
    const aSet = new Set(a.split(''))
    const overlap = m.split('').filter((c) => aSet.has(c)).length
    const sim = overlap / Math.max(a.length, m.length)
    if (sim >= 0.65) return NextResponse.json<DemoJudgeResponse>({ correct: false, status: 'partial', feedback: `惜しい！正解: ${meaning_ja}` })
    return NextResponse.json<DemoJudgeResponse>({ correct: false, status: 'incorrect', feedback: `正解: ${meaning_ja}` })
  }

  const prompt = `フレーズ「${phrase}」の意味判定:正解「${meaning_ja}」回答「${user_answer}」\ncorrect/partial/incorrectでJSONのみ返してください:{"status":"correct","feedback":"一言（20字以内）"}`

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
        max_tokens: 80,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    const text: string = data.content?.[0]?.text?.trim() ?? ''
    const match = text.match(/\{[\s\S]*?\}/)
    const parsed = match ? JSON.parse(match[0]) : null
    const status: 'correct' | 'partial' | 'incorrect' =
      parsed?.status === 'correct' ? 'correct' :
      parsed?.status === 'partial' ? 'partial' : 'incorrect'

    if (parsed?.status) {
      return NextResponse.json<DemoJudgeResponse>({
        correct: status === 'correct',
        status,
        feedback: parsed.feedback ?? (status !== 'correct' ? `正解: ${meaning_ja}` : ''),
      })
    }
    return NextResponse.json<DemoJudgeResponse>({ correct: false, status: 'incorrect', feedback: `正解: ${meaning_ja}` })
  } catch {
    return NextResponse.json<DemoJudgeResponse>({ correct: false, status: 'incorrect', feedback: `正解: ${meaning_ja}` })
  }
}
