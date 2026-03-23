import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 認証不要なパス
const PUBLIC_PATHS = ['/login', '/auth/callback', '/share', '/api/og', '/privacy', '/terms', '/about', '/contact', '/api/stripe/webhook']

// 認証状態に関わらず通過するパス（デモモード）
const GUEST_PATHS = ['/demo', '/api/demo']

// オンボーディング完了前でも許可するパス（認証は必要）
const ONBOARDING_EXEMPT = ['/onboarding', '/api/', '/auth/']

// Railway はリバースプロキシ経由のため request.url が localhost:8080 になる。
// x-forwarded-host から実際の公開 origin を構築してリダイレクト先を正しくする。
function getPublicOrigin(request: NextRequest): string {
  const ALLOWED_HOSTS = ['usepick.win', 'localhost:3000']
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https'
  const host = forwardedHost && ALLOWED_HOSTS.includes(forwardedHost)
    ? forwardedHost
    : new URL(request.url).host
  return `${forwardedProto}://${host}`
}

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
  const origin = getPublicOrigin(request)

  // ゲストパス（デモモード）は認証状態に関わらず通過
  if (GUEST_PATHS.some((p) => path.startsWith(p))) {
    return response
  }

  // パブリックパスは認証不要
  if (PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    // 認証済みで /login にアクセス → ホームへ
    if (user) {
      return NextResponse.redirect(`${origin}/`)
    }
    return response
  }

  // 未認証 → ログインページへ
  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // オンボーディング未完了 → /onboarding へ
  if (
    !user.user_metadata?.onboarding_complete &&
    !ONBOARDING_EXEMPT.some((p) => path.startsWith(p))
  ) {
    return NextResponse.redirect(`${origin}/onboarding`)
  }

  // /admin/* のみ ADMIN_EMAILS に含まれるユーザーのみ許可（未設定時は全員許可）
  // ※ /library/* と /api/admin/* はユーザー向け機能のため admin 制限から除外
  if (path.startsWith('/admin')) {
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    if (adminEmails.length > 0 && !adminEmails.includes((user.email ?? '').toLowerCase())) {
      return NextResponse.redirect(`${origin}/`)
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
