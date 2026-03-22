'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/quiz',            icon: '🎯', label: 'チャレンジ' },
  { href: '/phrases',         icon: '📚', label: 'マイピック' },
  { href: '/history',         icon: '📊', label: 'チャレンジ記録' },
  { href: '/library/import',  icon: '🎸', label: '英語ピック' },
]

// これらのパスプレフィックスで表示する
const SHOW_ON = ['/phrases', '/history', '/library']

export function BottomNav() {
  const pathname = usePathname()
  if (!SHOW_ON.some((p) => pathname.startsWith(p))) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-200 safe-area-pb">
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
                  ? 'text-emerald-600'
                  : 'text-gray-400 hover:text-gray-600'
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
