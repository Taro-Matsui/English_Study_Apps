import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const level = searchParams.get('level') ?? ''
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)

  const db = getSupabase()
  let query = db
    .from('app_logs')
    .select('id, level, endpoint, message, detail, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (['error', 'warn', 'info'].includes(level)) {
    query = query.eq('level', level)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 })
  return NextResponse.json(data ?? [])
}
