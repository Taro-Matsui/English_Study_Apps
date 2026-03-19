import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  if (!UUID_RE.test(id))
    return NextResponse.json({ error: 'IDが不正です' }, { status: 400 })

  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('import_jobs')
    .select('id, type, source_name, status, phrase_count, phrases, error_text, created_at, completed_at')
    .eq('id', id)
    .single()

  if (error || !data)
    return NextResponse.json({ error: 'ジョブが見つかりません' }, { status: 404 })

  return NextResponse.json(data)
}
