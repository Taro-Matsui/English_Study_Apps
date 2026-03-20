import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'
import { log } from '@/lib/logger'

// POST /api/user/delete-account — アカウントと全データを完全削除（GDPR 対応）
// auth.users の CASCADE DELETE により phrases / quiz_sessions / quiz_answers / import_jobs / user_progress が連鎖削除される
export async function POST() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getSupabaseAdmin()

  log({
    level: 'info',
    endpoint: '/api/user/delete-account',
    message: 'account_deletion_requested',
    detail: { user_id: user.id, email: user.email },
  })

  const { error } = await db.auth.admin.deleteUser(user.id)

  if (error) {
    log({ level: 'error', endpoint: '/api/user/delete-account', message: 'deletion_failed', detail: { user_id: user.id, error: error.message } })
    return NextResponse.json({ error: 'アカウントの削除に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
