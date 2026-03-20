import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// 認証不要なパス
const PUBLIC_PATHS = ['/login', '/auth/callback']

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

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest).*)',
  ],
}
