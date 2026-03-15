import Link from 'next/link'

const cards = [
  {
    href: '/phrases',
    icon: '📚',
    title: 'フレーズ一覧',
    desc: '登録済みフレーズを検索・確認',
    bg: 'bg-blue-50 hover:bg-blue-100',
    border: 'border-blue-200',
    iconBg: 'from-blue-500 to-blue-600',
  },
  {
    href: '/quiz',
    icon: '🎯',
    title: 'クイズ',
    desc: 'フレーズの意味を答えて学習',
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    border: 'border-emerald-200',
    iconBg: 'from-emerald-500 to-emerald-600',
  },
  {
    href: '/history',
    icon: '📊',
    title: 'チャレンジ記録',
    desc: '日々の回答履歴と実績を確認',
    bg: 'bg-amber-50 hover:bg-amber-100',
    border: 'border-amber-200',
    iconBg: 'from-amber-500 to-amber-600',
  },
  {
    href: '/admin/import',
    icon: '⚙️',
    title: 'インポート',
    desc: '字幕・テキストからフレーズを登録',
    bg: 'bg-violet-50 hover:bg-violet-100',
    border: 'border-violet-200',
    iconBg: 'from-violet-500 to-violet-600',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-2">
            <span className="text-3xl">⚡</span>
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
              <span className="text-slate-300 group-hover:translate-x-0.5 transition-transform">›</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
