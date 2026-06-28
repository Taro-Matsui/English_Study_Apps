import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const PHRASE_COLS =
  'id, phrase, pronunciation, meaning_ja, original_context, difficulty, source_title, source_type, usage_scene, engineer_level, added_date'

interface PhraseRow {
  id: string
  added_date?: string | null
  [k: string]: unknown
}

async function fetchPhrases(user: { id: string }, limit: number, excludeIds: string[]) {
  const db = getSupabaseAdmin()

  // ランダム取得（Supabase は ORDER BY random() を直接サポートしないため件数多めに取得してシャッフル）
  let query = db
    .from('phrases')
    .select('id, phrase, pronunciation, meaning_ja, original_context, difficulty, source_title, source_type, usage_scene, engineer_level, added_date')
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

  // SRS: due（next_review_date <= 今日JST）を最優先で出題。
  // focus（ピックアップ チャレンジ）は誤答リセット分(repetitions=0)を上位に並べる。
  const db = getSupabaseAdmin()
  const todayJst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)

  // 1. user_progress から due の phrase_id を取得（期限の古い順 / focus は rep 昇順優先）
  let dueQuery = db
    .from('user_progress')
    .select('phrase_id, next_review_date, repetitions')
    .eq('user_id', user.id)
    .lte('next_review_date', todayJst)
  dueQuery = mode === 'focus'
    ? dueQuery.order('repetitions', { ascending: true }).order('next_review_date', { ascending: true })
    : dueQuery.order('next_review_date', { ascending: true })
  const { data: dueRows } = await dueQuery.limit(limit * 3)

  const dueIds = (dueRows ?? [])
    .map((r: { phrase_id: string }) => r.phrase_id)
    .filter((id: string) => !excludeIds.includes(id))

  let result: PhraseRow[] = []
  if (dueIds.length > 0) {
    const { data } = await db
      .from('phrases')
      .select(PHRASE_COLS)
      .in('id', dueIds)
      .is('deleted_at', null)
      .eq('user_id', user.id)
    const ord = new Map(dueIds.map((id, i) => [id, i] as [string, number]))
    result = ((data ?? []) as PhraseRow[]).sort((a, b) => (ord.get(a.id) ?? 1e9) - (ord.get(b.id) ?? 1e9))
  }

  // 2. due が limit に満たない分は未学習フレーズ（user_progress 行なし）を新着順で補充
  if (result.length < limit) {
    const need = limit - result.length
    const { data: progressRows } = await db
      .from('user_progress')
      .select('phrase_id')
      .eq('user_id', user.id)
    const studied = new Set((progressRows ?? []).map((r: { phrase_id: string }) => r.phrase_id))
    const taken = new Set<string>([...excludeIds, ...result.map((p) => p.id)])
    const { data: idRows } = await db
      .from('phrases')
      .select('id')
      .is('deleted_at', null)
      .eq('user_id', user.id)
      .order('added_date', { ascending: false })
      .limit(500)
    const freshIds = ((idRows ?? []) as { id: string }[])
      .map((r) => r.id)
      .filter((id) => !studied.has(id) && !taken.has(id))
      .slice(0, need)
    if (freshIds.length > 0) {
      const { data } = await db
        .from('phrases')
        .select(PHRASE_COLS)
        .in('id', freshIds)
        .is('deleted_at', null)
        .eq('user_id', user.id)
      const ord = new Map(freshIds.map((id, i) => [id, i] as [string, number]))
      const fresh = ((data ?? []) as PhraseRow[]).sort((a, b) => (ord.get(a.id) ?? 1e9) - (ord.get(b.id) ?? 1e9))
      result = [...result, ...fresh]
    }
  }

  return NextResponse.json(result.slice(0, limit))
}
