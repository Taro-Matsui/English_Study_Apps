import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const source = searchParams.get('source') ?? ''

  const db = getSupabase()
  let query = db
    .from('phrases')
    .select('*')
    .order('added_date', { ascending: false })

  if (q) {
    query = query.or(`phrase.ilike.%${q}%,meaning_ja.ilike.%${q}%`)
  }
  if (source) {
    query = query.eq('source_type', source)
  }

  const { data, error } = await query.limit(100)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}
