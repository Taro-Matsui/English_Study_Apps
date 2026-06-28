import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import { getUserSubscription } from '@/lib/subscription'
import { checkDailyPracticeQuota } from '@/lib/plan-quota'
import { nextReview, deriveGrade, isMastered } from '@/lib/srs'
import { log } from '@/lib/logger'
import { CompleteRequest } from '@/types'

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ success: false, error: 'ログインが必要です' }, { status: 401 })

  const body: CompleteRequest = await req.json()
  const { answers } = body
  const sessionType = body.mode === 'focus' ? 'review' : 'srs'
  if (!answers?.length) return NextResponse.json({ success: false }, { status: 400 })
  // 1セッションあたりの回答数上限（DoS対策）
  if (answers.length > 100) return NextResponse.json({ success: false, error: '回答数が上限を超えています' }, { status: 400 })

  // 1日チャレンジ上限チェック
  const sub = await getUserSubscription(user.id)
  const practiceQuota = await checkDailyPracticeQuota(user.id, sub.plan)
  if (!practiceQuota.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `本日のチャレンジ上限（${practiceQuota.limit}回/日）に達しました。明日また挑戦してください！`,
        quota: practiceQuota,
      },
      { status: 429 }
    )
  }

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
        session_type: sessionType,
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
      response_time_ms: typeof a.response_time_ms === 'number' && a.response_time_ms > 0
        ? a.response_time_ms : null,
    }))

    const { error: answerErr } = await db.from('quiz_answers').insert(rows)
    if (answerErr) throw new Error('answer_insert_failed')

    // SRS: 回答結果から user_progress を更新（best-effort。失敗してもセッション保存は成功扱い）。
    // status/response_time_ms はリクエストの answers から grade を導出（quiz_answers へは保存しない）。
    try {
      const latest = new Map<string, (typeof answers)[number]>()
      for (const a of answers) latest.set(a.phrase_id, a) // 同一フレーズは最後の回答を採用
      const phraseIds = Array.from(latest.keys())

      const { data: progress } = await db
        .from('user_progress')
        .select('phrase_id, repetitions, interval_days, ease_factor')
        .eq('user_id', user.id)
        .in('phrase_id', phraseIds)
      const stateMap = new Map(
        (progress ?? []).map((p: { phrase_id: string; repetitions: number; interval_days: number; ease_factor: number }) => [p.phrase_id, p])
      )

      const todayJst = new Date(Date.now() + 9 * 60 * 60 * 1000) // 暦日(UTC)=JSTの今日
      const nowIso = new Date().toISOString()

      const progressRows = Array.from(latest.values()).map((a) => {
        const prev = stateMap.get(a.phrase_id)
        const grade = deriveGrade(a.status, a.response_time_ms, Boolean(a.is_correct))
        const next = nextReview(
          {
            repetitions: prev?.repetitions ?? 0,
            interval_days: prev?.interval_days ?? 1,
            ease_factor: prev?.ease_factor ?? 2.5,
          },
          grade,
          todayJst,
        )
        return {
          user_id: user.id,
          phrase_id: a.phrase_id,
          repetitions: next.repetitions,
          interval_days: next.interval_days,
          ease_factor: next.ease_factor,
          next_review_date: next.next_review_date,
          last_reviewed_at: nowIso,
          is_mastered: isMastered(next),
          updated_at: nowIso,
        }
      })

      if (progressRows.length > 0) {
        const { error: srsErr } = await db
          .from('user_progress')
          .upsert(progressRows, { onConflict: 'user_id,phrase_id' })
        if (srsErr) throw new Error(srsErr.message)
      }
    } catch (srsErr) {
      log({ level: 'error', endpoint: '/api/quiz/complete',
        message: 'srs_update_failed',
        detail: { error: srsErr instanceof Error ? srsErr.message : 'unknown' } })
    }

    revalidateTag(`stats:${user.id}`)
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
