import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// ランダムにフレーズを取得（クイズ用）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') ?? '10')

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
