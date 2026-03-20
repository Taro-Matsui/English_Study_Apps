import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import { log } from '@/lib/logger'

const ALLOWED_REASONS = ['product_name', 'not_phrase'] as const
type AllowedReason = typeof ALLOWED_REASONS[number]

// UUID v4 形式チェック（SQLインジェクション / 意図しいID操作を防ぐ）
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  const { id } = params

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: '不正なIDです' }, { status: 400 })
  }

  let body: { delete_reason: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストボディが不正です' }, { status: 400 })
  }

  const { delete_reason } = body
  if (!delete_reason || !(ALLOWED_REASONS as readonly string[]).includes(delete_reason)) {
    return NextResponse.json(
      { error: `削除理由は ${ALLOWED_REASONS.join(' / ')} のいずれかを指定してください` },
      { status: 400 }
    )
  }

  const db = getSupabaseAdmin()
  const { error } = await db
    .from('phrases')
    .update({ deleted_at: new Date().toISOString(), delete_reason: delete_reason as AllowedReason })
    .eq('id', id)

  if (error) {
    log({ level: 'error', endpoint: '/api/phrases/[id]', message: 'delete_failed',
      detail: { id, delete_reason } })
    return NextResponse.json({ error: 'データベースエラーが発生しました' }, { status: 500 })
  }
  log({ level: 'info', endpoint: '/api/phrases/[id]', message: 'phrase_deleted',
    detail: { id, delete_reason } })
  return NextResponse.json({ success: true })
}
