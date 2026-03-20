import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

/**
 * Server Component / Route Handler 用 — per-request Cookie aware クライアント
 * セッション情報を Cookie から読み書きするため、必ずリクエストごとに生成する
 * ※ Server Component / Route Handler 専用。Client Component には使わない
 */
export function createSupabaseServerClient(cookieStore?: ReadonlyRequestCookies) {
  const store = cookieStore ?? cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (store as any).set(name, value, options)
            )
          } catch {
            // Server Component 内では set が呼べないため無視
            // (セッションリフレッシュは middleware が担当)
          }
        },
      },
    }
  )
}
