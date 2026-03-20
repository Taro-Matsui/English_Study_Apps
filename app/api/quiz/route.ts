import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ランダムにフレーズを取得（クイズ用）
export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  // limit を 1〜50 に制限（未指定・不正値は 10 に正規化）
  const rawLimit = parseInt(searchParams.get('limit') ?? '10', 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 10

  // 除外するphrase_id（正解済みスキップ用）- UUID形式のみ受け付ける
  const rawExclude = searchParams.get('exclude') ?? ''
  const excludeIds = rawExclude
    .split(',')
    .map((s) => s.trim())
    .filter((s) => UUID_RE.test(s))
    .slice(0, 500)

  const db = getSupabaseAdmin()

  // ランダム取得（Supabase は ORDER BY random() を直接サポートしないため件数多めに取得してシャッフル）
  let query = db
    .from('phrases')
    .select('id, phrase, pronunciation, meaning_ja, original_context, difficulty, source_title, usage_scene, engineer_level')
    .is('deleted_at', null)
    .eq('user_id', user.id)

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data, error } = await query.limit(limit * 5)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // クライアント側でシャッフルするためそのまま返す
  return NextResponse.json(data ?? [])
}
