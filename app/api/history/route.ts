import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const db = getSupabase()

  const { data: sessions, error } = await db
    .from('quiz_sessions')
    .select(`
      id, started_at, completed_at, total_questions, correct_count,
      quiz_answers (
        is_correct, user_answer, ai_feedback, answered_at,
        phrase_id,
        phrases ( phrase, meaning_ja, original_context, usage_scene, engineer_level )
      )
    `)
    .order('started_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(sessions ?? [])
}
