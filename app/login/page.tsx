'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import { X_URL } from '@/lib/social'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [signupEmail, setSignupEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    if (mode === 'signup' && password !== confirmPassword) {
      setError('パスワードが一致しません')
      setLoading(false)
      return
    }

    const supabase = createBrowserSupabaseClient()

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(translateError(error.message))
      } else {
        router.push('/')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback` },
      })
      if (error) {
        if (error.message.includes('User already registered')) {
          // 未確認の状態で再登録しようとした場合は確認メールを再送する
          const { error: resendError } = await supabase.auth.resend({
            type: 'signup',
            email,
            options: { emailRedirectTo: `${location.origin}/auth/callback` },
          })
          if (!resendError) {
            setSignupEmail(email)
            setMessage('このメールアドレスは登録済みですが未確認です。確認メールを再送しました。')
          } else {
            setError('このメールアドレスは既に登録済みです。ログインタブからログインしてください。')
          }
        } else {
          setError(translateError(error.message))
        }
      } else {
        setSignupEmail(email)
        setMessage('確認メールを送信しました。メールのリンクをクリックしてログインしてください。')
      }
    }

    setLoading(false)
  }

  async function handleResend() {
    if (!signupEmail) return
    setResending(true)
    setError(null)
    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: signupEmail,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      setError(translateError(error.message))
    } else {
      setMessage('確認メールを再送しました。')
    }
    setResending(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">

        {/* ロゴ / タイトル */}
        <div className="text-center space-y-1">
          <p className="text-3xl">🧑‍💻</p>
          <h1 className="text-white font-bold text-lg">Engineer English</h1>
          <p className="text-slate-500 text-xs">エンジニア向け英語フレーズ学習</p>
        </div>

        {/* タブ切り替え */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setMessage(null); setConfirmPassword('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === m ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {m === 'signin' ? 'ログイン' : '新規登録'}
            </button>
          ))}
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="you@example.com"
              style={{ fontSize: '16px' }}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder={mode === 'signup' ? '8文字以上' : '••••••••'}
              minLength={mode === 'signup' ? 8 : undefined}
              style={{ fontSize: '16px' }}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">パスワード（確認）</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
                style={{ fontSize: '16px' }}
                className={`w-full bg-white/10 border rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none transition-colors disabled:opacity-50 ${
                  confirmPassword && confirmPassword !== password
                    ? 'border-red-500/60 focus:border-red-500'
                    : 'border-white/20 focus:border-blue-500'
                }`}
              />
              {confirmPassword && confirmPassword !== password && (
                <p className="text-red-400 text-xs mt-1">パスワードが一致しません</p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {message && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 space-y-2">
              <p className="text-emerald-400 text-sm">{message}</p>
              {signupEmail && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-xs text-slate-400 hover:text-slate-200 underline disabled:opacity-50"
                >
                  {resending ? '送信中...' : '確認メールを再送する'}
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password || (mode === 'signup' && password !== confirmPassword)}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '処理中...' : mode === 'signin' ? 'ログイン' : 'アカウント作成'}
          </button>
        </form>

        {/* デモモードリンク */}
        <div className="mt-4 text-center space-y-2">
          <p className="text-xs text-slate-600">
            登録なしで試してみたい方は
          </p>
          <a href="/demo" className="text-sm text-slate-400 hover:text-white underline">
            → デモモードで体験する
          </a>
          <div className="pt-2">
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
            >
              𝕏 アップデート情報はXで
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'メールアドレスまたはパスワードが間違っています'
  if (msg.includes('Email not confirmed')) return 'メールアドレスが未確認です。確認メールをご確認ください'
  if (msg.includes('Password should be at least')) return 'パスワードは8文字以上で設定してください'
  if (msg.includes('User already registered')) return 'このメールアドレスは既に登録されています'
  if (msg.includes('rate limit')) return 'リクエストが多すぎます。しばらく待ってから再試行してください'
  return `エラーが発生しました: ${msg}`
}
