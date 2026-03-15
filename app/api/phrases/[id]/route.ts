import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  let body: { delete_reason: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストボディが不正です' }, { status: 400 })
  }

  const { delete_reason } = body
  if (!delete_reason) {
    return NextResponse.json({ error: '削除理由を指定してください' }, { status: 400 })
  }

  const db = getSupabaseAdmin()
  const { error } = await db
    .from('phrases')
    .update({ deleted_at: new Date().toISOString(), delete_reason })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
