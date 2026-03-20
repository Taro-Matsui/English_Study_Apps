'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/quiz',            icon: '🎯', label: 'クイズ' },
  { href: '/phrases',         icon: '📚', label: 'フレーズ' },
  { href: '/history',         icon: '📊', label: '記録' },
  { href: '/library/import',  icon: '⚙️', label: 'インポート' },
]

// これらのパスプレフィックスで表示する
const SHOW_ON = ['/phrases', '/history', '/library']

export function BottomNav() {
  const pathname = usePathname()
  if (!SHOW_ON.some((p) => pathname.startsWith(p))) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 safe-area-pb">
      <div className="flex max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href) ||
            (item.href === '/library/import' && pathname.startsWith('/library'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-center transition-colors ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
