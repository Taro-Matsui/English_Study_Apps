'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage, LangToggle } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'
import { WelcomeGuide } from './WelcomeGuide'
import { AnnouncementBell } from './AnnouncementBell'
import { HintBubble } from './HintBubble'
import { PwaInstallHint } from './PwaInstallHint'
import { X_URL } from '@/lib/social'

const STATS_CACHE_KEY = 'home_stats_cache'

interface CachedStats { phraseCount: number; sourceCount: number; streak: number; todayDone: boolean; weakCount: number }

interface Props {
  phraseCount: number | null
  sourceCount: number | null
  streak: number
  todayDone: boolean
  weakCount: number
}

export function HomeContent({ phraseCount, sourceCount, streak, todayDone, weakCount }: Props) {
  const { lang, t } = useLanguage()
  const { user } = useAuth()

  // props が null のとき（Suspense fallback）は localStorage の前回値で即時表示
  const [cachedStats, setCachedStats] = useState<CachedStats | null>(null)
  const [cacheLoaded, setCacheLoaded] = useState(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STATS_CACHE_KEY)
      if (raw) setCachedStats(JSON.parse(raw))
    } catch {}
    setCacheLoaded(true)
  }, [])

  // 実データが来たらキャッシュを更新
  useEffect(() => {
    if (phraseCount === null) return
    try {
      localStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ phraseCount, sourceCount, streak, todayDone, weakCount }))
    } catch {}
  }, [phraseCount, sourceCount, streak, todayDone, weakCount])

  // 表示値: 実データ優先 → localStorage キャッシュ → null
  const displayPhraseCount = phraseCount ?? cachedStats?.phraseCount ?? null
  const displaySourceCount = sourceCount ?? cachedStats?.sourceCount ?? null
  const displayStreak      = phraseCount !== null ? streak : (cachedStats?.streak ?? 0)
  const displayTodayDone   = phraseCount !== null ? todayDone : (cachedStats?.todayDone ?? false)
  const displayWeakCount   = phraseCount !== null ? weakCount : (cachedStats?.weakCount ?? 0)

  // クイズページ表示を高速化するためフレーズをバックグラウンドでプリフェッチ
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('app_settings') ?? '{}')
      if (saved.skipMastered) return // 除外リストが変わるためプリフェッチ不可

      const cache = sessionStorage.getItem('quiz_prefetch')
      if (cache) {
        const { ts } = JSON.parse(cache) as { ts: number }
        if (Date.now() - ts < 90_000) return // 90秒以内なら再フェッチ不要
      }

      fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 10 }),
      })
        .then((r) => r.json())
        .then((data: unknown) => {
          if (Array.isArray(data) && data.length) {
            sessionStorage.setItem('quiz_prefetch', JSON.stringify({ phrases: data, ts: Date.now() }))
          }
        })
        .catch(() => {})
    } catch {}
  }, [user?.id])

  const subCards = [
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
      badge: displayPhraseCount !== null
        ? lang === 'ja' ? `${displayPhraseCount}件` : `${displayPhraseCount} phrases`
        : null,
    },
    {
      href: '/library/import',
      icon: '🎸',
      title: t('nav_import'),
      desc: t('nav_import_desc'),
      bg: 'bg-violet-50 hover:bg-violet-100',
      border: 'border-violet-200',
      iconBg: 'from-violet-500 to-violet-600',
      badge: displaySourceCount !== null
        ? lang === 'ja' ? `${displaySourceCount}ファイル` : `${displaySourceCount} files`
        : null,
    },
  ]

  // キャッシュ確認前、またはキャッシュなし＆サーバーデータ未着 → スプラッシュ
  const showSplash = !cacheLoaded || (phraseCount === null && cachedStats === null)

  if (showSplash) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <div className="inline-flex items-center justify-center gap-1 px-5 h-14 rounded-2xl bg-amber-100">
            <span className="text-xl">👩‍💻</span>
            <span className="text-lg">💬</span>
            <span className="text-xl">👨‍💻</span>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reel</h1>
            <p className="text-gray-500 text-sm">実際の会話からフレーズを手繰り寄せる</p>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6 pb-24">
      <PwaInstallHint />
      <div className="w-full max-w-sm space-y-5">

        {/* ヘッダー */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center gap-1 px-5 h-14 rounded-2xl bg-amber-100 backdrop-blur-sm mb-1">
            <span className="text-xl">👩‍💻</span>
            <span className="text-lg">💬</span>
            <span className="text-xl">👨‍💻</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reel</h1>
          <p className="text-gray-500 text-sm">{t('tagline')}</p>
        </div>

        {/* ストリーク表示 */}
        {displayStreak > 0 && (
          <div className="flex items-center justify-center gap-2.5">
            <Link href="/streak" className="flex items-center gap-2 hover:opacity-75 transition-opacity">
              <span className="text-lg">🔥</span>
              <span className="text-gray-800 font-bold text-base">
                {displayStreak}{lang === 'ja' ? '日連続' : '-day streak'}
              </span>
            </Link>
            {displayTodayDone && (
              <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                ✓ {lang === 'ja' ? '本日クリア済' : 'Done today'}
              </span>
            )}
          </div>
        )}

        {/* メインクイズ CTA */}
        <HintBubble
          hintId="home-quiz"
          message={'🎯 まずここをタップ！\nフレーズの意味を日本語で答えるクイズです'}
          userId={user?.id}
          position="bottom"
        >
          <Link href="/quiz"
            className="block p-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] transition-all duration-150 shadow-lg shadow-emerald-500/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                🎯
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-lg">{t('nav_quiz')}</p>
                <p className="text-emerald-100 text-sm mt-0.5">
                  {!displayTodayDone
                    ? (lang === 'ja' ? '今日はまだ学習していません' : "You haven't studied today")
                    : (lang === 'ja' ? '今日のクイズを続ける' : "Continue today's quiz")}
                </p>
              </div>
              <span className="text-emerald-200 text-xl flex-shrink-0">›</span>
            </div>
          </Link>
        </HintBubble>

        {/* 初回インポート誘導（シードフレーズのみの状態） */}
        {displaySourceCount !== null && displaySourceCount <= 1 && (
          <Link href="/library/import"
            className="flex items-center gap-3 p-3.5 rounded-xl bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors">
            <span className="text-xl flex-shrink-0">📥</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-violet-700">
                最初のフレーズをPickしよう 🎸
              </p>
              <p className="text-xs text-violet-500 mt-0.5">
                会話録・記事・字幕からAIがフレーズをPickします
              </p>
            </div>
            <span className="text-violet-400 flex-shrink-0">›</span>
          </Link>
        )}

        {/* 弱点フォーカス */}
        {displayWeakCount > 0 && (
          <Link href="/quiz?mode=focus"
            className="flex items-center gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-600">
                {lang === 'ja' ? `弱点フレーズ ${displayWeakCount}件` : `${displayWeakCount} weak phrases`}
              </p>
              <p className="text-xs text-red-400 mt-0.5">
                {lang === 'ja' ? '苦手なフレーズを重点的に復習' : 'Focus on phrases you often miss'}
              </p>
            </div>
            <span className="text-red-400 flex-shrink-0">›</span>
          </Link>
        )}

        {/* サブカード */}
        <div className="space-y-2.5">
          {subCards.map((c) => {
            const cardContent = (
              <Link href={c.href}
                className={`flex items-center gap-4 p-4 rounded-2xl border ${c.border} ${c.bg} transition-all duration-150 group`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.iconBg} flex items-center justify-center text-lg shadow-sm flex-shrink-0`}>
                  {c.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{c.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
                </div>
                {c.badge && (
                  <span className="text-xs font-medium text-gray-500 bg-white/60 px-2 py-0.5 rounded-full flex-shrink-0">
                    {c.badge}
                  </span>
                )}
                <span className="text-gray-300 group-hover:translate-x-0.5 transition-transform flex-shrink-0">›</span>
              </Link>
            )

            if (c.href === '/library/import') {
              return (
                <HintBubble
                  key={c.href}
                  hintId="home-import"
                  message={'🎸 会話録・記事・字幕を追加するとAIがフレーズを自動でPickします'}
                  userId={user?.id}
                  position="top"
                  prerequisiteHintId="home-quiz"
                >
                  {cardContent}
                </HintBubble>
              )
            }

            return <div key={c.href}>{cardContent}</div>
          })}
        </div>

        <WelcomeGuide />

        {/* フッター: 設定・ベル・言語・X */}
        <div className="flex justify-center items-center gap-2 flex-wrap">
          <Link href="/settings" className="text-xs px-2.5 py-0.5 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors font-medium">
            ⚙ {lang === 'ja' ? '設定' : 'Settings'}
          </Link>
          <LangToggle className="text-gray-500 border-gray-300 hover:bg-gray-100" />
          <AnnouncementBell />
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 text-sm font-bold"
            aria-label="X (Twitter)"
          >
            𝕏
          </a>
        </div>
      </div>
    </div>
  )
}
