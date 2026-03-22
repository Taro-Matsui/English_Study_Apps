import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function fetchPhrases(user: { id: string }, limit: number, excludeIds: string[]) {
  const db = getSupabaseAdmin()

  // ランダム取得（Supabase は ORDER BY random() を直接サポートしないため件数多めに取得してシャッフル）
  let query = db
    .from('phrases')
    .select('id, phrase, pronunciation, meaning_ja, original_context, difficulty, source_title, usage_scene, engineer_level, added_date')
    .is('deleted_at', null)
    .eq('user_id', user.id)

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  return query.limit(limit * 2)
}

// GET: limit クエリのみ（exclude なし）
export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const rawLimit = parseInt(searchParams.get('limit') ?? '10', 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 10

  const { data, error } = await fetchPhrases(user, limit, [])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST: body に { limit?, exclude?: string[], mode?: 'normal' | 'focus' } を受け取る
export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  let body: { limit?: number; exclude?: string[]; mode?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const rawLimit = typeof body.limit === 'number' ? body.limit : 10
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 10
  const mode = body.mode === 'focus' ? 'focus' : 'normal'

  // UUID v4 形式のみ受け付ける（最大500件）
  const excludeIds = (Array.isArray(body.exclude) ? body.exclude : [])
    .filter((s): s is string => typeof s === 'string' && UUID_RE.test(s))
    .slice(0, 500)

  // 弱点フォーカスモード: 直近5セッションで2回以上不正解のフレーズを優先出題
  if (mode === 'focus') {
    const db = getSupabaseAdmin()
    const { data: recentSessions } = await db
      .from('quiz_sessions')
      .select('id')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(5)

    if (recentSessions?.length) {
      const sessionIds = recentSessions.map((s: { id: string }) => s.id)
      const { data: wrongAnswers } = await db
        .from('quiz_answers')
        .select('phrase_id')
        .in('session_id', sessionIds)
        .eq('is_correct', false)

      if (wrongAnswers?.length) {
        const counts = new Map<string, number>()
        wrongAnswers.forEach((a: { phrase_id: string }) => {
          counts.set(a.phrase_id, (counts.get(a.phrase_id) ?? 0) + 1)
        })
        const weakIds = Array.from(counts.entries())
          .filter(([, c]) => c >= 2)
          .map(([id]) => id)
          .filter((id) => UUID_RE.test(id) && !excludeIds.includes(id))
          .slice(0, limit * 5)

        if (weakIds.length > 0) {
          const { data: weakPhrases, error } = await db
            .from('phrases')
            .select('id, phrase, pronunciation, meaning_ja, original_context, difficulty, source_title, usage_scene, engineer_level')
            .in('id', weakIds)
            .is('deleted_at', null)
            .eq('user_id', user.id)
          if (!error && weakPhrases?.length) {
            const shuffled = [...weakPhrases].sort(() => Math.random() - 0.5)
            return NextResponse.json(shuffled.slice(0, limit))
          }
        }
      }
    }
    // 弱点フレーズが不足 → 通常出題にフォールバック
  }

  const { data, error } = await fetchPhrases(user, limit, excludeIds)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const shuffled = [...(data ?? [])].sort(() => Math.random() - 0.5)

  // 即答済みフレーズの再出確率を下げる:
  // 直近10セッションで3秒以内に正解したフレーズをリストの後ろへ移動
  let quickMasteredIds = new Set<string>()
  try {
    const db = getSupabaseAdmin()
    const { data: recentSessions } = await db
      .from('quiz_sessions')
      .select('id')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(10)
    if (recentSessions?.length) {
      const sessionIds = recentSessions.map((s: { id: string }) => s.id)
      const { data: fastAnswers } = await db
        .from('quiz_answers')
        .select('phrase_id')
        .in('session_id', sessionIds)
        .eq('is_correct', true)
        .not('response_time_ms', 'is', null)
        .lt('response_time_ms', 3500)
      if (fastAnswers?.length) {
        const counts = new Map<string, number>()
        fastAnswers.forEach((a: { phrase_id: string }) => {
          counts.set(a.phrase_id, (counts.get(a.phrase_id) ?? 0) + 1)
        })
        quickMasteredIds = new Set(
          Array.from(counts.entries()).filter(([, c]) => c >= 3).map(([id]) => id)
        )
      }
    }
  } catch {}

  // 直近7日以内に追加されたフレーズを「新着」として優先出題
  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const isRecent = (p: { added_date?: string | null }) => !!p.added_date && p.added_date >= recentCutoff

  const newPhrases = shuffled.filter((p) => isRecent(p) && !quickMasteredIds.has(p.id))
  const normal     = shuffled.filter((p) => !isRecent(p) && !quickMasteredIds.has(p.id))
  const quick      = shuffled.filter((p) => quickMasteredIds.has(p.id))
  return NextResponse.json([...newPhrases, ...normal, ...quick].slice(0, limit))
}
