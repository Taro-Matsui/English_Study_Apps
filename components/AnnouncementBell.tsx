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
        className="relative p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-800 border border-white/10 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col">

            <div className="px-5 pt-5 pb-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-white">お知らせ</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-xl w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
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
                        ? 'bg-blue-500/10 border border-blue-500/20'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {isUnread && <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />}
                      <p className="text-sm font-semibold text-white flex-1">{a.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        a.type === 'update'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}>
                        {a.type === 'update' ? '機能追加' : 'お知らせ'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{a.body}</p>
                    <p className="text-[10px] text-slate-600">{a.date}</p>
                  </div>
                )
              })}
              {ANNOUNCEMENTS.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">お知らせはありません</p>
              )}
            </div>

            {unread.length > 0 && (
              <div className="p-4 border-t border-white/10 flex-shrink-0">
                <button
                  onClick={markAllRead}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors"
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
