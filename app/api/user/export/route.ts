import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/user/export — ユーザーの全データを JSON で返す（GDPR 対応）
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabaseAdmin()

  const [phrasesRes, sessionsRes, answersRes, progressRes] = await Promise.all([
    db.from('phrases')
      .select('phrase, pronunciation, meaning_ja, original_context, source_type, source_title, source_date, difficulty, usage_scene, engineer_level, deleted_at, delete_reason, added_date')
      .eq('user_id', user.id)
      .order('added_date', { ascending: false }),
    db.from('quiz_sessions')
      .select('id, total_questions, correct_count, completed_at')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false }),
    db.from('quiz_answers')
      .select('phrase_id, user_answer, is_correct, ai_feedback, answered_at, session_id')
      .in('session_id',
        (await db.from('quiz_sessions').select('id').eq('user_id', user.id)).data?.map((s) => s.id) ?? []
      ),
    db.from('user_progress')
      .select('phrase_id, is_mastered')
      .eq('user_id', user.id),
  ])

  const exportData = {
    exported_at: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      metadata: user.user_metadata,
    },
    phrases: phrasesRes.data ?? [],
    quiz_sessions: sessionsRes.data ?? [],
    quiz_answers: answersRes.data ?? [],
    mastered_phrases: progressRes.data ?? [],
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="engineer-english-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
