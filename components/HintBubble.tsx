'use client'

import { useState, useEffect } from 'react'

interface Props {
  hintId: string
  message: string
  userId?: string | null
  /** 表示する前に先にクリアされていないといけないヒントID */
  prerequisiteHintId?: string
  position?: 'top' | 'bottom'
  children: React.ReactNode
}

export function HintBubble({
  hintId,
  message,
  userId,
  prerequisiteHintId,
  position = 'bottom',
  children,
}: Props) {
  const [visible, setVisible] = useState(false)
  const storageKey = `hint_${hintId}_${userId ?? 'guest'}`

  useEffect(() => {
    // チュートリアルが完了するまでヒントを表示しない
    const tutKey = userId ? `tutorial_seen_${userId}` : null
    if (tutKey && !localStorage.getItem(tutKey)) return

    // prerequisite ヒントがまだ未クリアなら表示しない
    if (prerequisiteHintId) {
      const prereqKey = `hint_${prerequisiteHintId}_${userId ?? 'guest'}`
      if (!localStorage.getItem(prereqKey)) return
    }

    if (!localStorage.getItem(storageKey)) {
      const t = setTimeout(() => setVisible(true), 1200)
      return () => clearTimeout(t)
    }
  }, [storageKey, userId, prerequisiteHintId])

  function dismiss() {
    localStorage.setItem(storageKey, '1')
    setVisible(false)
  }

  const bubblePos =
    position === 'top'
      ? 'bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2'
      : 'top-[calc(100%+10px)] left-1/2 -translate-x-1/2'

  const arrowPos =
    position === 'top'
      ? 'top-full left-1/2 -translate-x-1/2 border-t-[7px] border-t-brand border-x-[6px] border-x-transparent'
      : 'bottom-full left-1/2 -translate-x-1/2 border-b-[7px] border-b-brand border-x-[6px] border-x-transparent'

  return (
    <div className="relative" onClickCapture={dismiss}>
      {children}
      {visible && (
        <>
          <div className={`absolute ${bubblePos} z-50 pointer-events-none`}>
            <div className="pointer-events-auto relative bg-brand text-white text-xs font-semibold px-3.5 py-2.5 rounded-2xl shadow-xl max-w-[220px] text-center leading-relaxed">
              {message}
              <button
                onClick={(e) => { e.stopPropagation(); dismiss() }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-brand-deep text-white rounded-full text-[10px] flex items-center justify-center hover:bg-brand transition-colors"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
            <div className={`absolute w-0 h-0 ${arrowPos}`} />
          </div>
        </>
      )}
    </div>
  )
}

/** 設定画面などからチュートリアルとヒントをすべてリセット */
export function resetTutorialAndHints(userId: string) {
  localStorage.removeItem(`welcome_seen_${userId}`)
  const toRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('hint_') && key.endsWith(`_${userId}`)) {
      toRemove.push(key)
    }
  }
  toRemove.forEach((k) => localStorage.removeItem(k))
}
