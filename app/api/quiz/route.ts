import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// ランダムにフレーズを取得（クイズ用）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  // limit を 1〜50 に制限（未指定・不正値は 10 に正規化）
  const rawLimit = parseInt(searchParams.get('limit') ?? '10', 10)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 10

  const db = getSupabase()

  // ランダム取得（Supabase は ORDER BY random() を直接サポートしないため件数多めに取得してシャッフル）
  const { data, error } = await db
    .from('phrases')
    .select('id, phrase, pronunciation, meaning_ja, original_context, difficulty, source_title')
    .is('deleted_at', null)
    .limit(limit * 3)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // クライアント側でシャッフルするためそのまま返す
  return NextResponse.json(data ?? [])
}
