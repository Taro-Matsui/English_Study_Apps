import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ビルド時にモジュールトップレベルで初期化しないよう遅延初期化
let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

// クライアントサイド用（読み取り）
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return _supabase
}

// サーバーサイド用（書き込み・管理操作）
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _supabaseAdmin
}
