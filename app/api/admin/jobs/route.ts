import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('import_jobs')
    .select('id, type, source_name, status, phrase_count, error_text, created_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: 'ジョブ一覧の取得に失敗しました' }, { status: 500 })
  return NextResponse.json(data ?? [])
}
