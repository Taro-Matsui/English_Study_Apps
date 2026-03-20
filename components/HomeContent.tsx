'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useLanguage, LangToggle } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'
import { TutorialGuide } from './TutorialGuide'
import { AnnouncementBell } from './AnnouncementBell'
import { HintBubble } from './HintBubble'
import { X_URL } from '@/lib/social'

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
      badge: phraseCount !== null
        ? lang === 'ja' ? `${phraseCount}件` : `${phraseCount} phrases`
        : null,
    },
    {
      href: '/library/import',
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 pb-24">
      <div className="w-full max-w-sm space-y-5">

        {/* ヘッダー */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center gap-1 px-5 h-14 rounded-2xl bg-white/10 backdrop-blur-sm mb-1">
            <span className="text-xl">👩‍💻</span>
            <span className="text-lg">💬</span>
            <span className="text-xl">👨‍💻</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Engineer English</h1>
          <p className="text-slate-400 text-sm">{t('tagline')}</p>
        </div>

        {/* ストリーク表示 */}
        {streak > 0 && (
          <div className="flex items-center justify-center gap-2.5">
            <span className="text-lg">🔥</span>
            <span className="text-white font-bold text-base">
              {streak}{lang === 'ja' ? '日連続' : '-day streak'}
            </span>
            {todayDone && (
              <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                ✓ {lang === 'ja' ? '今日完了' : 'Done today'}
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
                  {!todayDone
                    ? (lang === 'ja' ? '今日はまだ学習していません' : "You haven't studied today")
                    : (lang === 'ja' ? '今日のクイズを続ける' : "Continue today's quiz")}
                </p>
              </div>
              <span className="text-emerald-200 text-xl flex-shrink-0">›</span>
            </div>
          </Link>
        </HintBubble>

        {/* 弱点フォーカス */}
        {weakCount > 0 && (
          <Link href="/quiz?mode=focus"
            className="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-300">
                {lang === 'ja' ? `弱点フレーズ ${weakCount}件` : `${weakCount} weak phrases`}
              </p>
              <p className="text-xs text-red-400/70 mt-0.5">
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
            )

            if (c.href === '/library/import') {
              return (
                <HintBubble
                  key={c.href}
                  hintId="home-import"
                  message={'⚙️ 会議録やドキュメントを貼り付けるとAIがフレーズを自動抽出します'}
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

        <TutorialGuide />

        {/* フッター: 設定・ベル・言語・X */}
        <div className="flex justify-center items-center gap-2 flex-wrap">
          <Link href="/settings" className="text-xs px-2.5 py-0.5 rounded-full border border-slate-600 text-slate-400 hover:bg-white/10 transition-colors font-medium">
            ⚙ {lang === 'ja' ? '設定' : 'Settings'}
          </Link>
          <LangToggle className="text-slate-400 border-slate-600 hover:bg-white/10" />
          <AnnouncementBell />
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-500 hover:text-slate-300 text-sm font-bold"
            aria-label="X (Twitter)"
          >
            𝕏
          </a>
        </div>
      </div>
    </div>
  )
}
