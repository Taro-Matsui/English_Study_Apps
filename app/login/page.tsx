'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import { X_URL } from '@/lib/social'

type Mode = 'signin' | 'signup'

const FEATURES = [
  {
    icon: '🎸',
    title: '会話録・記事からフレーズをピックする',
    desc: '議事録・YouTube字幕・技術ブログなどを貼り付けるだけ。AIが使える英語フレーズを自動でピックします。',
  },
  {
    icon: '🎯',
    title: 'チャレンジで即定着',
    desc: '日本語の意味を見て英語で答えるシンプルなチャレンジ。AIが回答を採点してフィードバックします。',
  },
  {
    icon: '📊',
    title: 'ピックアップで弱点を克服',
    desc: '正解率・連続日数・ピックアップフレーズをトラッキング。苦手なフレーズを重点的に復習できます。',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    setError(null)
    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      setError(translateError(error.message))
      setGoogleLoading(false)
    }
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
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-lg mx-auto px-4 py-10 space-y-10">

        {/* ── ヒーロー ── */}
        <div className="text-center space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pick_logo.png" alt="Pick" className="w-20 h-20 rounded-2xl mx-auto mb-1" />
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Pick</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            実際の会話から、フレーズをピックする学習アプリ。<br />
            自分のリアルなテキストで、使える英語を身につけよう。
          </p>
        </div>

        {/* ── 機能紹介 ── */}
        <div className="space-y-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3 bg-white rounded-2xl border border-amber-100 p-4 shadow-sm">
              <span className="text-2xl flex-shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{f.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── ログイン / 登録フォーム ── */}
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 space-y-5">
          <h2 className="text-center text-sm font-semibold text-gray-700">
            {mode === 'signin' ? 'アカウントにログイン' : '無料で始める'}
          </h2>

          {/* タブ切り替え */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setMessage(null); setConfirmPassword('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === m ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'signin' ? 'ログイン' : '新規登録'}
              </button>
            ))}
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="you@example.com"
                style={{ fontSize: '16px' }}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder={mode === 'signup' ? '8文字以上' : '••••••••'}
                minLength={mode === 'signup' ? 8 : undefined}
                style={{ fontSize: '16px' }}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">パスワード（確認）</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="••••••••"
                  style={{ fontSize: '16px' }}
                  className={`w-full bg-white border rounded-xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none transition-colors disabled:opacity-50 ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-gray-200 focus:border-blue-500'
                  }`}
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-red-500 text-xs mt-1">パスワードが一致しません</p>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}
            {message && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 space-y-2">
                <p className="text-emerald-600 text-sm">{message}</p>
                {signupEmail && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="text-xs text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
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
              {loading ? '処理中...' : mode === 'signin' ? 'ログイン' : '無料で始める'}
            </button>
          </form>

          {/* Google ログイン */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">または</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {googleLoading ? (
                <span className="text-xs animate-pulse">接続中...</span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Googleでログイン
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── デモ・リンク ── */}
        <div className="text-center space-y-2">
          <p className="text-xs text-gray-400">登録なしで試してみたい方は</p>
          <a href="/demo" className="text-sm text-amber-700 hover:text-amber-900 underline font-medium">
            → デモモードで体験する
          </a>
        </div>

        {/* ── フッター ── */}
        <footer className="text-center space-y-2 pb-4">
          <div className="flex justify-center gap-4 flex-wrap text-xs text-gray-400">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">プライバシーポリシー</Link>
            <Link href="/terms" className="hover:text-gray-600 transition-colors">利用規約</Link>
            <Link href="/about" className="hover:text-gray-600 transition-colors">運営者情報</Link>
            <Link href="/contact" className="hover:text-gray-600 transition-colors">お問い合わせ</Link>
          </div>
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            𝕏 アップデート情報はXで
          </a>
        </footer>

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
