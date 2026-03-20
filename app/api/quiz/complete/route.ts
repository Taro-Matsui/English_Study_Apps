import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import { log } from '@/lib/logger'
import { CompleteRequest } from '@/types'

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ success: false, error: 'ログインが必要です' }, { status: 401 })

  const body: CompleteRequest = await req.json()
  const { answers } = body
  if (!answers?.length) return NextResponse.json({ success: false }, { status: 400 })
  // 1セッションあたりの回答数上限（DoS対策）
  if (answers.length > 100) return NextResponse.json({ success: false, error: '回答数が上限を超えています' }, { status: 400 })

  // phrase_id の UUID v4 形式バリデーション
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  for (const a of answers) {
    if (!UUID_RE.test(a.phrase_id)) {
      return NextResponse.json({ success: false, error: 'Invalid phrase_id format' }, { status: 400 })
    }
  }

  try {
    const db = getSupabaseAdmin()
    const correct = answers.filter((a) => a.is_correct).length

    const { data: session, error: sessionErr } = await db
      .from('quiz_sessions')
      .insert({
        user_id: user.id,
        total_questions: answers.length,
        correct_count: correct,
        completed_at: new Date().toISOString(),
        session_type: 'random',
      })
      .select()
      .single()

    if (sessionErr) throw new Error('session_insert_failed')

    const rows = answers.map((a) => ({
      session_id: session.id,
      phrase_id: a.phrase_id,
      user_answer: String(a.user_answer ?? '').slice(0, 500),
      is_correct: Boolean(a.is_correct),
      ai_feedback: String(a.ai_feedback ?? '').slice(0, 300),
    }))

    const { error: answerErr } = await db.from('quiz_answers').insert(rows)
    if (answerErr) throw new Error('answer_insert_failed')

    log({ level: 'info', endpoint: '/api/quiz/complete',
      message: 'session_saved', detail: { session_id: session.id, answer_count: answers.length, correct_count: correct } })
    return NextResponse.json({ success: true, session_id: session.id })
  } catch (err) {
    log({ level: 'error', endpoint: '/api/quiz/complete',
      message: err instanceof Error ? err.message : 'unknown_error',
      detail: { answer_count: answers.length } })
    return NextResponse.json({ success: false, error: 'セッション保存に失敗しました' }, { status: 500 })
  }
}
