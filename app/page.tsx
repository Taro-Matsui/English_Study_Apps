import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getStats() {
  try {
    const db = getSupabase()
    const [phraseRes, sourceRes] = await Promise.all([
      db.from('phrases').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      db.from('phrases').select('source_title').is('deleted_at', null).not('source_title', 'is', null),
    ])
    const phraseCount = phraseRes.count ?? 0
    const sourceCount = new Set(
      (sourceRes.data ?? []).map((r: { source_title: string }) => r.source_title)
    ).size
    return { phraseCount, sourceCount }
  } catch {
    return { phraseCount: null, sourceCount: null }
  }
}

export default async function Home() {
  const { phraseCount, sourceCount } = await getStats()

  const cards = [
    {
      href: '/quiz',
      icon: '🎯',
      title: 'クイズ',
      desc: 'フレーズの意味を答えて学習',
      bg: 'bg-emerald-50 hover:bg-emerald-100',
      border: 'border-emerald-200',
      iconBg: 'from-emerald-500 to-emerald-600',
      badge: null as string | null,
    },
    {
      href: '/history',
      icon: '📊',
      title: 'チャレンジ記録',
      desc: '日々の回答履歴と実績を確認',
      bg: 'bg-amber-50 hover:bg-amber-100',
      border: 'border-amber-200',
      iconBg: 'from-amber-500 to-amber-600',
      badge: null as string | null,
    },
    {
      href: '/phrases',
      icon: '📚',
      title: 'フレーズ一覧',
      desc: '登録済みフレーズを検索・確認',
      bg: 'bg-blue-50 hover:bg-blue-100',
      border: 'border-blue-200',
      iconBg: 'from-blue-500 to-blue-600',
      badge: phraseCount !== null ? `${phraseCount}件` : null,
    },
    {
      href: '/admin/import',
      icon: '⚙️',
      title: 'インポート',
      desc: '字幕・テキストからフレーズを登録',
      bg: 'bg-violet-50 hover:bg-violet-100',
      border: 'border-violet-200',
      iconBg: 'from-violet-500 to-violet-600',
      badge: sourceCount !== null ? `${sourceCount}ファイル` : null,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-1 px-5 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-2">
            <span className="text-2xl">👩‍💻</span>
            <span className="text-lg">💬</span>
            <span className="text-2xl">👨‍💻</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Engineer English</h1>
          <p className="text-slate-400 text-sm">エンジニア文脈の英語を実務感覚で習得する</p>
        </div>
        <div className="space-y-3">
          {cards.map((c) => (
            <Link key={c.href} href={c.href}
              className={`flex items-center gap-4 p-4 rounded-2xl border ${c.border} ${c.bg} transition-all duration-150 group`}>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.iconBg} flex items-center justify-center text-xl shadow-sm flex-shrink-0`}>
                {c.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">{c.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.desc}</p>
              </div>
              {c.badge && (
                <span className="text-xs font-medium text-slate-500 bg-white/60 px-2 py-0.5 rounded-full flex-shrink-0">
                  {c.badge}
                </span>
              )}
              <span className="text-slate-300 group-hover:translate-x-0.5 transition-transform flex-shrink-0">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
