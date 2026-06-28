import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { isRateLimited } from '@/lib/rate-limit'
import { getUserSubscription } from '@/lib/subscription'
import { checkMonthlyFeedbackQuota, getJudgeModel } from '@/lib/plan-quota'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isLocalCorrect } from '@/lib/answer-match'
import type { JudgeStatus } from '@/types'

export interface JudgeRequest {
  phrase: string
  user_answer: string
  meaning_ja: string
  original_context?: string
  /** 'reception'=英→日意味当て（既定） / 'production'=日→英の産出 */
  direction?: 'reception' | 'production'
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

  // プラン取得 → Starter の月次フィードバック上限チェック + モデル選択
  const sub = await getUserSubscription(user.id)
  const plan = sub.plan

  if (plan === 'starter') {
    // period_start を plan_quotas から取得（なければ月初）
    const supabase = getSupabaseAdmin()
    const { data: quota } = await supabase
      .from('plan_quotas')
      .select('period_start')
      .eq('user_id', user.id)
      .single()

    const periodStart = quota?.period_start
      ? new Date(quota.period_start)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1)

    const feedbackQuota = await checkMonthlyFeedbackQuota(user.id, periodStart)
    if (!feedbackQuota.allowed) {
      return NextResponse.json<JudgeResponse>(
        {
          correct: false,
          status: 'incorrect',
          feedback: '',
          error: `今月のフィードバック上限に達しました（${feedbackQuota.limit}回/月）。プランをアップグレードしてください。`,
        },
        { status: 429 }
      )
    }
  }

  const judgeModel = getJudgeModel(plan)

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

  const direction = body.direction === 'production' ? 'production' : 'reception'

  // ローカル一致チェック — Claude を呼ばずに即時 correct 返却。
  if (direction === 'production') {
    // 産出（意味→英語）は綴り厳密性が要るため、目標フレーズとの完全一致のみスキップ。
    // 英語向け正規化（小文字化・記号/ハイフン/連続空白の吸収）で自明な正答を LLM なしで返す。
    // 受容用の緩い一致（区切り/部分包含）は使わない。
    const normEng = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    if (normEng(user_answer) === normEng(phrase)) {
      return NextResponse.json<JudgeResponse>({ correct: true, status: 'correct', feedback: '正解' })
    }
  } else if (isLocalCorrect(user_answer, meaning_ja)) {
    // 受容（英→日）: 完全一致 / 区切り要素一致 / 実質的な部分包含で LLM スキップ（T1-1(A)）。
    return NextResponse.json<JudgeResponse>({ correct: true, status: 'correct', feedback: '正解' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json<JudgeResponse>(
      { correct: false, status: 'incorrect', feedback: '', error: 'ANTHROPIC_API_KEY が設定されていません' },
      { status: 500 }
    )
  }

  const contextLine = original_context ? `\n使用例文（英語）: "${original_context}"` : ''
  const contextJaInstruction = original_context
    ? 'context_ja: 上記使用例文の自然な日本語全訳'
    : 'context_ja: このフレーズの典型的な使用場面を日本語で一文（例文形式で）'

  const prompt = direction === 'production'
    ? `目標の英語フレーズ: "${phrase}"
その意味（日本語）: "${meaning_ja}"
ユーザーが入力した英語: "${user_answer}"${contextLine}

【評価ルール】ユーザーは上記の意味を英語で表現しようとしています。
- "correct": 目標フレーズと一致、または意味的に同等で自然な英語表現（語形・時制の軽微な違い、大文字小文字・スペルの軽微な揺れは許容）
- "partial": 意味は近いが語彙・コロケーション・語法がずれる／不自然
- "incorrect": 意味が異なる、または英語として成立しない

フィードバック（feedback・30字以内）：
- correct: 簡潔な肯定（別の自然な言い方があれば一言）
- partial: 何が惜しいか・より自然な表現のヒント
- incorrect: 正しい英語表現のヒント

以下のJSONのみを返してください（説明不要）：
{"status": "correct|partial|incorrect", "feedback": "フィードバック（30字以内）", "context_ja": "${contextJaInstruction}"}`
    : `フレーズ: "${phrase}"
このフレーズの意味: "${meaning_ja}"
ユーザーの回答: "${user_answer}"${contextLine}

【評価ルール（重要）】
以下のどちらかを満たせば "correct" と評価します：
① このフレーズの一般的・辞書的な意味を正しく理解している
② この使用例での具体的な使われ方・ニュアンスを正しく理解している
いずれかが正しければ correct、どちらも方向性が合っているが核心がずれていれば partial、全く異なれば incorrect。

3段階評価：
- "correct": ①または②を満たしている
- "partial": 方向性は合っているが重要な要素が不足・不正確
- "incorrect": フレーズの意味と全く関係ない

フィードバック（feedback）の書き方（30字以内）：
- correct: 「正解」または簡潔な肯定 ＋ あれば「／この例では〜」と文脈補足
- partial: 何が足りないかのヒント
- incorrect: 正しい方向性へのヒント

以下のJSONのみを返してください（説明不要）：
{"status": "correct|partial|incorrect", "feedback": "フィードバック（30字以内）", "context_ja": "${contextJaInstruction}"}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: judgeModel,
        max_tokens: 400,
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
