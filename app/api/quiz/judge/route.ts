import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { isRateLimited } from '@/lib/rate-limit'
import type { JudgeStatus } from '@/types'

export interface JudgeRequest {
  phrase: string
  user_answer: string
  meaning_ja: string
  original_context?: string
}

export type { JudgeStatus }

export interface JudgeResponse {
  correct: boolean       // backward compat: true = correct only
  status: JudgeStatus   // 3-way: correct / partial / incorrect
  feedback: string
  context_ja?: string
  error?: string
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json<JudgeResponse>(
    { correct: false, status: 'incorrect', feedback: '', error: 'Unauthorized' },
    { status: 401 }
  )

  // レート制限: 1時間あたり60回（クイズ6セッション分）
  if (await isRateLimited(user.id, 'quiz/judge', 60)) {
    return NextResponse.json<JudgeResponse>(
      { correct: false, status: 'incorrect', feedback: '', error: '1時間あたりの利用上限に達しました。しばらくしてから再度お試しください。' },
      { status: 429 }
    )
  }

  const body: JudgeRequest = await req.json()

  // 入力長制限 + 改行サニタイズ（プロンプトインジェクション・DoS 対策）
  // H1: 改行をスペースに置換することでプロンプト構造の破壊を防ぐ
  const sanitizeInput = (s: string) => s.replace(/[\n\r]/g, ' ')
  const phrase = sanitizeInput(String(body.phrase ?? '').slice(0, 200))
  const user_answer = sanitizeInput(String(body.user_answer ?? '').slice(0, 500))
  const meaning_ja = sanitizeInput(String(body.meaning_ja ?? '').slice(0, 500))
  const original_context = body.original_context
    ? sanitizeInput(String(body.original_context).slice(0, 1000))
    : undefined

  if (!user_answer?.trim()) {
    return NextResponse.json<JudgeResponse>({ correct: false, status: 'incorrect', feedback: '回答を入力してください' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json<JudgeResponse>(
      { correct: false, status: 'incorrect', feedback: '', error: 'ANTHROPIC_API_KEY が設定されていません' },
      { status: 500 }
    )
  }

  const contextLine = original_context ? `\n使用例文（英語）: "${original_context}"` : ''
  const contextInstruction = original_context ? '\n3. 使用例文を自然な日本語に全訳する' : ''
  const contextField = original_context ? ', "context_ja": "使用例文の日本語全訳"' : ''

  const prompt = `フレーズ: "${phrase}"
正解の意味: "${meaning_ja}"
ユーザーの回答: "${user_answer}"${contextLine}

以下を行ってください：
1. ユーザーの回答を以下の3段階で評価する:
   - "correct": 正解の核心を正しく理解している（完全一致不要）
   - "partial": 方向性は合っているが重要な要素が不足・不正確
   - "incorrect": 正解と大きく異なる、または見当違い
2. 判定理由またはヒントを20字以内で作成する${contextInstruction}

以下のJSONのみを返してください（説明不要）：
{"status": "correct", "feedback": "理由を一言（20字以内）"${contextField}}`

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
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    const text: string = data.content?.[0]?.text?.trim() ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null

    const status: JudgeStatus =
      parsed?.status === 'correct' ? 'correct' :
      parsed?.status === 'partial' ? 'partial' : 'incorrect'
    if (parsed && parsed.status) {
      return NextResponse.json<JudgeResponse>({
        correct: status === 'correct',
        status,
        feedback: parsed.feedback ?? '',
        context_ja: parsed.context_ja,
      })
    }
    return NextResponse.json<JudgeResponse>({ correct: false, status: 'incorrect', feedback: '判定できませんでした' })
  } catch (err) {
    // C2: 内部エラー詳細はログのみ。クライアントへは汎用メッセージを返す
    console.error('[quiz/judge] error:', err instanceof Error ? err.message : String(err))
    return NextResponse.json<JudgeResponse>(
      { correct: false, status: 'incorrect', feedback: '', error: 'AI判定サービスが一時的に利用できません' },
      { status: 500 }
    )
  }
}
