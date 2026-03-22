import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { isRateLimited } from '@/lib/rate-limit'
import { AI_MODELS } from '@/lib/ai-models'

export interface ExplainRequest {
  phrase_id?: string
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

  const body: ExplainRequest = await req.json()

  // UUID v4 バリデーション
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const phraseId = body.phrase_id && UUID_RE.test(body.phrase_id) ? body.phrase_id : null

  // キャッシュチェック: phrases.explanation にすでに保存されていれば即返却（レート制限カウントなし）
  if (phraseId) {
    const db = getSupabaseAdmin()
    const { data } = await db
      .from('phrases')
      .select('explanation')
      .eq('id', phraseId)
      .eq('user_id', user.id)
      .single()
    if (data?.explanation) {
      return NextResponse.json<ExplainResponse>({ explanation: data.explanation })
    }
  }

  // レート制限: 1時間あたり20回（キャッシュミス時のみカウント）
  if (await isRateLimited(user.id, 'quiz/explain', 20)) {
    return NextResponse.json<ExplainResponse>(
      { explanation: '', error: '1時間あたりの利用上限に達しました。しばらくしてから再度お試しください。' },
      { status: 429 }
    )
  }

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

【話すとき】使う場面・トーン・注意点（エンジニアの実例で一文）
【聞くとき】相手がこれを使ったときの意図の読み方
【使い分け】類似表現との違い、または複数の意味がある場合の整理
【NGパターン】日本人がよくやる誤用（なければ省略可）`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODELS.EXPLAIN,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await res.json()
    const explanation: string = data.content?.[0]?.text?.trim() ?? ''

    if (!explanation) {
      return NextResponse.json<ExplainResponse>({ explanation: '', error: '解説を生成できませんでした' })
    }

    // 解説を DB にキャッシュ（fire-and-forget、user_id チェック付き）
    if (phraseId) {
      const db = getSupabaseAdmin()
      db.from('phrases')
        .update({ explanation })
        .eq('id', phraseId)
        .eq('user_id', user.id)
        .then(() => {})
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
