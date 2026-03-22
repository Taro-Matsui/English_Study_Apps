import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 認証不要なパス
const PUBLIC_PATHS = ['/login', '/auth/callback', '/share', '/api/og', '/privacy', '/terms', '/about', '/contact']

// 認証状態に関わらず通過するパス（デモモード）
const GUEST_PATHS = ['/demo', '/api/demo']

// オンボーディング完了前でも許可するパス（認証は必要）
const ONBOARDING_EXEMPT = ['/onboarding', '/api/', '/auth/']

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  // @supabase/ssr でセッション Cookie をリフレッシュ（これをしないとセッションが失効する）
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() でセッション検証 (getSession() はサーバーサイドでは使わない)
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // ゲストパス（デモモード）は認証状態に関わらず通過
  if (GUEST_PATHS.some((p) => path.startsWith(p))) {
    return response
  }

  // パブリックパスは認証不要
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    // 認証済みで /login にアクセス → ホームへ
    if (user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // 未認証 → ログインページへ
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // オンボーディング未完了 → /onboarding へ
  if (
    !user.user_metadata?.onboarding_complete &&
    !ONBOARDING_EXEMPT.some((p) => path.startsWith(p))
  ) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // /admin/* のみ ADMIN_EMAILS に含まれるユーザーのみ許可（未設定時は全員許可）
  // ※ /library/* と /api/admin/* はユーザー向け機能のため admin 制限から除外
  if (path.startsWith('/admin')) {
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    if (adminEmails.length > 0 && !adminEmails.includes((user.email ?? '').toLowerCase())) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのパスにミドルウェアを適用:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - 静的アセット (png, jpg, svg, ico, webp, woff2, etc.)
     * - ads.txt, robots.txt, sitemap.xml
     */
    '/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|otf|css|js|map)|ads\\.txt|robots\\.txt|sitemap\\.xml).*)',
  ],
}
