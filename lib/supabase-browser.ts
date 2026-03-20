import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Component 用ブラウザクライアント
 * onAuthStateChange / signIn / signOut など、ブラウザ側の auth 操作に使う
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
