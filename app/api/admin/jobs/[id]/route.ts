import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  const { id } = params
  if (!UUID_RE.test(id))
    return NextResponse.json({ error: 'IDが不正です' }, { status: 400 })

  const db = getSupabaseAdmin()
  const { data, error } = await db
    .from('import_jobs')
    .select('id, type, source_name, status, phrase_count, phrases, error_text, created_at, completed_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data)
    return NextResponse.json({ error: 'ジョブが見つかりません' }, { status: 404 })

  return NextResponse.json(data)
}

// PATCH /api/admin/jobs/[id] — stuck ジョブを強制キャンセル（status → error）
export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  const { id } = params
  if (!UUID_RE.test(id))
    return NextResponse.json({ error: 'IDが不正です' }, { status: 400 })

  const db = getSupabaseAdmin()

  // 自分のジョブかつ processing 状態のもののみキャンセル可
  const { data, error } = await db
    .from('import_jobs')
    .update({ status: 'error', error_text: '手動でキャンセルされました', completed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .in('status', ['pending', 'processing'])
    .select('id')
    .single()

  if (error || !data)
    return NextResponse.json({ error: 'キャンセルできませんでした（完了済みまたは存在しないジョブ）' }, { status: 400 })

  return NextResponse.json({ success: true })
}
