'use client'

import { useState, useEffect } from 'react'
import { ANNOUNCEMENTS } from '@/lib/announcements'

const STORAGE_KEY = 'seen_announcements'

export function AnnouncementBell() {
  const [seenIds, setSeenIds] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
      setSeenIds(Array.isArray(stored) ? stored : [])
    } catch {
      setSeenIds([])
    }
  }, [])

  const unread = ANNOUNCEMENTS.filter((a) => !seenIds.includes(a.id))

  function markAllRead() {
    const allIds = ANNOUNCEMENTS.map((a) => a.id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds))
    setSeenIds(allIds)
    setOpen(false)
  }

  if (!mounted) return null

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
        aria-label="お知らせ"
      >
        <span className="text-base">🔔</span>
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">

            <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-gray-900">お知らせ</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {ANNOUNCEMENTS.map((a) => {
                const isUnread = !seenIds.includes(a.id)
                return (
                  <div
                    key={a.id}
                    className={`p-4 rounded-xl space-y-1.5 ${
                      isUnread
                        ? 'bg-brand/10 border border-brand/20'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {isUnread && <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />}
                      <p className="text-sm font-semibold text-gray-900 flex-1">{a.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        a.type === 'update'
                          ? 'bg-emerald-500/20 text-emerald-600'
                          : 'bg-gray-200 text-gray-500'
                      }`}>
                        {a.type === 'update' ? '機能追加' : 'お知らせ'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{a.body}</p>
                    <p className="text-[10px] text-gray-400">{a.date}</p>
                  </div>
                )
              })}
              {ANNOUNCEMENTS.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">お知らせはありません</p>
              )}
            </div>

            {unread.length > 0 && (
              <div className="p-4 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={markAllRead}
                  className="w-full py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-deep transition-colors"
                >
                  すべて既読にする
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/** 設定画面などから全お知らせを既読リセットする */
export function resetAnnouncements() {
  localStorage.removeItem(STORAGE_KEY)
}
