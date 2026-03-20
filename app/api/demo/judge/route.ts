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
  if (checkDemoRateLimit(ip, 'demo/judge', 60)) {
    return NextResponse.json<DemoJudgeResponse>(
      { correct: false, status: 'incorrect', feedback: '', error: 'しばらくしてから再度お試しください' },
      { status: 429 }
    )
  }

  const body: DemoJudgeRequest = await req.json()
  const sanitize = (s: string) => String(s ?? '').replace(/[\n\r]/g, ' ')
  const user_answer = sanitize(body.user_answer).slice(0, 500)
  const meaning_ja = sanitize(body.meaning_ja).slice(0, 500)

  if (!user_answer.trim()) {
    return NextResponse.json<DemoJudgeResponse>({ correct: false, status: 'incorrect', feedback: '回答を入力してください' })
  }

  const a = normalize(user_answer)
  const m = normalize(meaning_ja)

  // 完全一致
  if (a === m) {
    return NextResponse.json<DemoJudgeResponse>({ correct: true, status: 'correct', feedback: '完全一致！' })
  }

  // 部分一致
  if (m.includes(a) && a.length >= m.length * 0.55) {
    return NextResponse.json<DemoJudgeResponse>({ correct: true, status: 'correct', feedback: '正解！' })
  }
  if (a.includes(m) && m.length >= a.length * 0.55) {
    return NextResponse.json<DemoJudgeResponse>({ correct: true, status: 'correct', feedback: '正解！' })
  }

  // 文字ベースの類似度
  const aSet = new Set(a.split(''))
  const overlap = m.split('').filter((c) => aSet.has(c)).length
  const similarity = overlap / Math.max(a.length, m.length)

  if (similarity >= 0.65) {
    return NextResponse.json<DemoJudgeResponse>({ correct: false, status: 'partial', feedback: `惜しい！正解: ${meaning_ja}` })
  }
  return NextResponse.json<DemoJudgeResponse>({ correct: false, status: 'incorrect', feedback: `正解: ${meaning_ja}` })
}
