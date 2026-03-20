import { cookies } from 'next/headers'
import { createSupabaseServerClient } from './supabase-server'
import type { User } from '@supabase/supabase-js'

/**
 * 現在のリクエストから認証ユーザーを取得する（null 許容）
 *
 * Route Handler での使い方:
 *   const user = await getUser()
 *   if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
 */
export async function getUser(): Promise<User | null> {
  const supabase = createSupabaseServerClient(cookies())
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
