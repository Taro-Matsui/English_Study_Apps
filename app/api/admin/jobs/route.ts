import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('import_jobs')
    .select('id, type, source_name, status, phrase_count, error_text, created_at, completed_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: 'ジョブ一覧の取得に失敗しました' }, { status: 500 })
  return NextResponse.json(data ?? [])
}
