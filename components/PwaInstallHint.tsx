'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'pwa_hint_dismissed'

/** Safari iOS か判定 */
function isIosSafari(): boolean {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const isIos = /iphone|ipad|ipod/i.test(ua)
  // Chrome/Firefox on iOS は CriOS/FxiOS を含む
  const isSafari = isIos && !/CriOS|FxiOS|EdgiOS/i.test(ua)
  return isSafari
}

/** スタンドアロン（インストール済み）か判定 */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true
  )
}

export function PwaInstallHint() {
  const [show, setShow] = useState(false)
  // Android Chrome: beforeinstallprompt イベントを保持
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    if (isStandalone()) return                            // すでにインストール済み
    if (localStorage.getItem(STORAGE_KEY)) return        // 非表示にした

    // Android Chrome / Edge: インストールプロンプト
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS Safari: 案内バナー
    if (isIosSafari()) setShow(true)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setShow(false)
  }

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        localStorage.setItem(STORAGE_KEY, '1')
      }
      setDeferredPrompt(null)
      setShow(false)
    }
  }

  if (!show) return null

  const isAndroid = !!deferredPrompt

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-40 rounded-2xl shadow-lg border border-amber-200 p-4 flex items-start gap-3"
      style={{ background: 'rgba(245,240,232,0.97)', backdropFilter: 'blur(8px)' }}
    >
      {/* アイコン */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="" width={40} height={40} className="rounded-xl flex-shrink-0 shadow-sm" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-amber-900">Pick をホーム画面に追加</p>
        {isAndroid ? (
          <p className="text-xs text-amber-700/70 mt-0.5">
            アプリとしてインストールするとより快適に使えます
          </p>
        ) : (
          <p className="text-xs text-amber-700/70 mt-0.5 leading-relaxed">
            Safari の <span className="font-semibold">共有ボタン</span>（↑）→「<span className="font-semibold">ホーム画面に追加</span>」
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isAndroid && (
          <button
            onClick={handleInstall}
            className="text-xs px-3 py-1.5 rounded-xl bg-amber-800 text-white font-semibold hover:bg-amber-700 transition-colors"
          >
            追加
          </button>
        )}
        <button
          onClick={dismiss}
          className="text-xs px-2 py-1.5 rounded-xl text-amber-600 hover:bg-amber-100 transition-colors"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
