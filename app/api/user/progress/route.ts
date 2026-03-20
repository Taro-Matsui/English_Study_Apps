import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/user/progress — 習得済みフレーズ ID 一覧を返す
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('user_progress')
    .select('phrase_id')
    .eq('user_id', user.id)
    .eq('is_mastered', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ids: (data ?? []).map((r) => r.phrase_id) })
}

// POST /api/user/progress — フレーズを習得済みにする
// body: { phrase_id: string }
export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let phrase_id: string
  try {
    const body = await request.json()
    phrase_id = body.phrase_id
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!phrase_id || typeof phrase_id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(phrase_id)) {
    return NextResponse.json({ error: 'Invalid phrase_id' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { error } = await db
    .from('user_progress')
    .upsert(
      { user_id: user.id, phrase_id, is_mastered: true },
      { onConflict: 'user_id,phrase_id' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// DELETE /api/user/progress — 習得済みを全クリア
export async function DELETE() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabaseAdmin()
  const { error } = await db
    .from('user_progress')
    .delete()
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
