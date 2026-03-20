import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  const db = getSupabase()

  const { data: sessions, error } = await db
    .from('quiz_sessions')
    .select(`
      id, completed_at, total_questions, correct_count,
      quiz_answers (
        is_correct, user_answer, ai_feedback, answered_at,
        phrase_id,
        phrases ( phrase, meaning_ja, original_context, usage_scene, engineer_level )
      )
    `)
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('[history]', error.message)
    return NextResponse.json({ error: '履歴の取得に失敗しました' }, { status: 500 })
  }
  return NextResponse.json(sessions ?? [])
}
