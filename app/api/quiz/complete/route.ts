import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { CompleteRequest } from '@/types'

export async function POST(req: NextRequest) {
  const body: CompleteRequest = await req.json()
  const { answers } = body
  if (!answers?.length) return NextResponse.json({ success: false }, { status: 400 })

  try {
    const db = getSupabase()
    const correct = answers.filter((a) => a.is_correct).length

    const { data: session, error: sessionErr } = await db
      .from('quiz_sessions')
      .insert({
        total_questions: answers.length,
        correct_count: correct,
        completed_at: new Date().toISOString(),
        session_type: 'random',
      })
      .select()
      .single()

    if (sessionErr) throw new Error(sessionErr.message)

    const rows = answers.map((a) => ({
      session_id: session.id,
      phrase_id: a.phrase_id,
      user_answer: a.user_answer,
      is_correct: a.is_correct,
      ai_feedback: a.ai_feedback,
    }))

    const { error: answerErr } = await db.from('quiz_answers').insert(rows)
    if (answerErr) throw new Error(answerErr.message)

    return NextResponse.json({ success: true, session_id: session.id })
  } catch (err) {
    console.error('[quiz/complete]', err)
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 })
  }
}
