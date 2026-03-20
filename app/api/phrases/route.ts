import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

const ALLOWED_SOURCE_TYPES = ['DSH_Event', 'YouTube', 'Podcast']

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  // 検索文字列: 100文字以内に制限し、PostgRESTメタ文字をエスケープ
  const rawQ = searchParams.get('q')?.trim() ?? ''
  // PostgREST 構文文字（,.()*"）とLIKEワイルドカード（%_）を除去・エスケープ
  const q = rawQ.slice(0, 100)
    .replace(/[%_]/g, (c) => `\\${c}`)       // LIKE ワイルドカードをエスケープ
    .replace(/[,.()*"']/g, '')               // PostgREST フィルター特殊文字を除去
  // source: 許可リストでのみ受け付ける
  const rawSource = searchParams.get('source') ?? ''
  const source = ALLOWED_SOURCE_TYPES.includes(rawSource) ? rawSource : ''

  const db = getSupabaseAdmin()
  let query = db
    .from('phrases')
    .select('*')
    .is('deleted_at', null)
    .eq('user_id', user.id)
    .order('added_date', { ascending: false })

  if (q) {
    // .or() 文字列補間を避け、チェーンで指定することで PostgREST インジェクションを防ぐ
    query = query.or(
      `phrase.ilike.%${q}%,meaning_ja.ilike.%${q}%`
    )
  }
  if (source) {
    query = query.eq('source_type', source)
  }

  const { data, error } = await query.limit(100)
  if (error) {
    console.error('[phrases]', error.message)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }
  return NextResponse.json(data)
}
