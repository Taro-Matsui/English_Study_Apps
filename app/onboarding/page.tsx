'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

type StudyPurpose = 'meeting' | 'review' | 'reading' | 'interview' | 'general'
type StudyLevel = 'beginner' | 'intermediate' | 'advanced'

const DOMAIN_PRESETS = [
  'データエンジニア',
  'データサイエンティスト',
  'フロントエンド開発',
  'バックエンド開発',
  'セキュリティ',
  'ビジネス・マーケティング',
  'ワイン・料理',
]

const PURPOSES: { value: StudyPurpose; icon: string; label: string; desc: string }[] = [
  { value: 'meeting',   icon: '💬', label: 'ミーティング・日常会話',  desc: 'チームとのやり取りやスタンドアップで使う表現' },
  { value: 'review',    icon: '👨‍💻', label: 'コードレビュー・Slack',  desc: 'レビューコメントやSlackで使う技術的表現' },
  { value: 'reading',   icon: '📚', label: '技術ドキュメント読解',     desc: '英語のドキュメントや論文をスムーズに読む' },
  { value: 'interview', icon: '🎤', label: '採用面接・プレゼン',       desc: 'フォーマルな場で使えるビジネス英語' },
  { value: 'general',   icon: '🌐', label: '総合的に学びたい',         desc: 'バランスよくエンジニア英語全般を習得' },
]

const LEVELS: { value: StudyLevel; label: string; desc: string }[] = [
  { value: 'beginner',     label: '初級', desc: '英語をほぼ使ったことがない' },
  { value: 'intermediate', label: '中級', desc: '読めるが会話・作文が難しい' },
  { value: 'advanced',     label: '上級', desc: 'ビジネス英語を洗練させたい' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [purpose, setPurpose] = useState<StudyPurpose | null>(null)
  const [level, setLevel] = useState<StudyLevel | null>(null)
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!user?.user_metadata?.onboarding_complete

  // 編集モード: ユーザーメタデータから現在値を取得して初期値に設定
  useEffect(() => {
    if (!user) return
    const p = user.user_metadata?.study_purpose as StudyPurpose | undefined
    const l = user.user_metadata?.study_level as StudyLevel | undefined
    const d = user.user_metadata?.study_domain as string | undefined
    if (p && PURPOSES.some((x) => x.value === p)) setPurpose(p)
    if (l && LEVELS.some((x) => x.value === l)) setLevel(l)
    if (d) setDomain(d)
  }, [user])

  async function handleSubmit() {
    if (!purpose || !level) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ study_purpose: purpose, study_level: level, study_domain: domain.trim() || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? '設定の保存に失敗しました')
        setLoading(false)
        return
      }
      // 編集モードは設定ページへ戻る、初回はホームへ
      router.push(isEdit ? '/settings' : '/')
      router.refresh()
    } catch {
      setError('ネットワークエラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">

        {/* ヘッダー */}
        <div className="text-center space-y-2">
          {isEdit ? (
            <>
              <p className="text-3xl">⚙️</p>
              <h1 className="text-xl font-bold">学習設定を変更</h1>
              <p className="text-slate-400 text-sm">設定はフレーズ抽出のプロンプトに反映されます。</p>
            </>
          ) : (
            <>
              <p className="text-4xl">🧑‍💻</p>
              <h1 className="text-xl font-bold">Engineer English へようこそ</h1>
              <p className="text-slate-400 text-sm">あなたの学習スタイルを教えてください。<br />フレーズ抽出や出題をカスタマイズします。</p>
            </>
          )}
        </div>

        {/* 学習目的 */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">英語を使う主な目的は？</h2>
          <div className="space-y-2">
            {PURPOSES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPurpose(p.value)}
                className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                  purpose === p.value
                    ? 'border-blue-500 bg-blue-500/15'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">{p.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${purpose === p.value ? 'text-blue-300' : 'text-white'}`}>
                    {p.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                </div>
                {purpose === p.value && <span className="ml-auto text-blue-400 flex-shrink-0">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 英語レベル */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">現在の英語レベルは？</h2>
          <div className="flex gap-2">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLevel(l.value)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-center transition-colors ${
                  level === l.value
                    ? 'border-blue-500 bg-blue-500/15'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className={`text-sm font-bold ${level === l.value ? 'text-blue-300' : 'text-white'}`}>
                  {l.label}
                </span>
                <span className="text-xs text-slate-500 leading-tight">{l.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 専門領域（任意） */}
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold text-slate-300">専門領域・興味（任意）</h2>
            <span className="text-xs text-slate-600">フレーズ抽出の優先度に反映されます</span>
          </div>
          {/* プリセットチップ */}
          <div className="flex flex-wrap gap-2">
            {DOMAIN_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDomain((prev) => prev === preset ? '' : preset)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  domain === preset
                    ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                    : 'border-white/15 bg-white/5 text-slate-400 hover:bg-white/10'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          {/* フリーテキスト */}
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value.slice(0, 100))}
            placeholder="または自由に入力（例: 機械学習、クラウドインフラ、DX推進）"
            style={{ fontSize: '16px' }}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 transition-colors text-sm"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleSubmit}
            disabled={!purpose || !level || loading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '保存中...' : isEdit ? '設定を更新する' : 'はじめる →'}
          </button>
          {isEdit && (
            <button
              onClick={() => router.back()}
              className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              キャンセル
            </button>
          )}
        </div>

        {!isEdit && (
          <p className="text-center text-xs text-slate-600">設定はあとから変更できます</p>
        )}
      </div>
    </div>
  )
}
