'use client'

import Link from 'next/link'
import { useLanguage, LangToggle } from '@/lib/i18n'

interface Props {
  phraseCount: number | null
  sourceCount: number | null
}

export function HomeContent({ phraseCount, sourceCount }: Props) {
  const { lang, t } = useLanguage()

  const cards = [
    {
      href: '/quiz',
      icon: '🎯',
      title: t('nav_quiz'),
      desc: t('nav_quiz_desc'),
      bg: 'bg-emerald-50 hover:bg-emerald-100',
      border: 'border-emerald-200',
      iconBg: 'from-emerald-500 to-emerald-600',
      badge: null as string | null,
    },
    {
      href: '/history',
      icon: '📊',
      title: t('nav_history'),
      desc: t('nav_history_desc'),
      bg: 'bg-amber-50 hover:bg-amber-100',
      border: 'border-amber-200',
      iconBg: 'from-amber-500 to-amber-600',
      badge: null as string | null,
    },
    {
      href: '/phrases',
      icon: '📚',
      title: t('nav_phrases'),
      desc: t('nav_phrases_desc'),
      bg: 'bg-blue-50 hover:bg-blue-100',
      border: 'border-blue-200',
      iconBg: 'from-blue-500 to-blue-600',
      badge: phraseCount !== null
        ? lang === 'ja' ? `${phraseCount}件` : `${phraseCount} phrases`
        : null,
    },
    {
      href: '/admin/import',
      icon: '⚙️',
      title: t('nav_import'),
      desc: t('nav_import_desc'),
      bg: 'bg-violet-50 hover:bg-violet-100',
      border: 'border-violet-200',
      iconBg: 'from-violet-500 to-violet-600',
      badge: sourceCount !== null
        ? lang === 'ja' ? `${sourceCount}ファイル` : `${sourceCount} files`
        : null,
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
          <p className="text-slate-400 text-sm">{t('tagline')}</p>
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
        <div className="flex justify-center">
          <LangToggle className="text-slate-400 border-slate-600 hover:bg-white/10" />
        </div>
      </div>
    </div>
  )
}
