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

  // 本日のチャレンジ数とプランの上限を取得
  const [dailyPractice, setDailyPractice] = useState<{ used: number; limit: number; plan: string } | null>(null)
  // チャーン防衛: 決済失敗(past_due)を検知して支払い方法更新を促す
  const [pastDue, setPastDue] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  useEffect(() => {
    Promise.all([
      fetch('/api/stripe/subscription').then((r) => r.json()),
      fetch('/api/quiz/daily-count').then((r) => r.json()).catch(() => null),
    ]).then(([sub, countData]) => {
      const plan: string = sub?.plan ?? 'free'
      const used: number = countData?.count ?? 0
      const limit = plan === 'free' ? 5 : 10
      setDailyPractice({ used, limit, plan })
      setPastDue(sub?.status === 'past_due')
    }).catch(() => {})
  }, [user?.id])

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
    } catch {}
    setPortalLoading(false)
  }

  // クイズページ表示を高速化するためフレーズをバックグラウンドでプリフェッチ
  useEffect(() => {
    try {
      // SRS では出題順をサーバ(due 順)が決めるため、全ユーザーでプリフェッチ可能
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
      bg: 'bg-ground hover:bg-amber-100',
      border: 'border-line',
      iconBg: 'from-amber-500 to-amber-600',
      badge: null as string | null,
    },
    {
      href: '/phrases',
      icon: '📚',
      title: t('nav_phrases'),
      desc: t('nav_phrases_desc'),
      bg: 'bg-brand-soft hover:bg-brand-soft',
      border: 'border-brand',
      iconBg: 'from-brand to-brand-deep',
      badge: null as string | null,
    },
    {
      href: '/library/import',
      icon: '🎸',
      title: t('nav_import'),
      desc: t('nav_import_desc'),
      bg: 'bg-violet-50 hover:bg-violet-100',
      border: 'border-violet-200',
      iconBg: 'from-violet-500 to-violet-600',
      badge: null as string | null,
    },
  ]

  // キャッシュ確認前、またはキャッシュなし＆サーバーデータ未着 → スプラッシュ
  const showSplash = !cacheLoaded || (phraseCount === null && cachedStats === null)

  if (showSplash) {
    return (
      <div className="min-h-screen bg-ground flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 animate-fade-in">
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pick</h1>
            <p className="text-gray-500 text-sm">会話からフレーズをPickして学ぼう</p>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-brand animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ground flex flex-col items-center justify-center p-6 pb-24">
      <PwaInstallHint />
      <div className="w-full max-w-sm space-y-5">

        {/* ヘッダー */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pick</h1>
          <p className="text-gray-500 text-sm">{t('tagline')}</p>
        </div>

        {/* チャーン防衛: 決済失敗バナー（意図せぬ解約の回収） */}
        {pastDue && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-center gap-3">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-700">お支払いに失敗しました</p>
              <p className="text-xs text-red-600/80 mt-0.5 leading-relaxed">
                有料プランを継続するには支払い方法を更新してください。
              </p>
            </div>
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="flex-shrink-0 text-xs font-bold bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {portalLoading ? '移動中…' : '更新する'}
            </button>
          </div>
        )}

        {/* サマリーカード */}
        <div className="grid grid-cols-3 gap-2">
          <Link href="/phrases" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center hover:bg-ground transition-colors">
            <p className="text-xl font-bold text-gray-900">
              {displayPhraseCount !== null ? displayPhraseCount : '—'}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">マイピックリスト</p>
          </Link>
          <Link href="/streak" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center hover:bg-ground transition-colors">
            <p className="text-xl font-bold text-gray-900 flex items-center justify-center gap-0.5">
              {displayStreak > 0 && <span className="text-base">🔥</span>}
              {displayStreak}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
              {lang === 'ja' ? '連続日数' : 'Streak'}
            </p>
          </Link>
          <Link href="/library/jobs" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center hover:bg-ground transition-colors">
            <p className="text-xl font-bold text-gray-900">
              {displaySourceCount !== null ? displaySourceCount : '—'}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">あなたの出会い数</p>
          </Link>
        </div>

        {/* 今日完了バッジ */}
        {displayTodayDone && (
          <div className="flex justify-center">
            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              ✓ {lang === 'ja' ? '今日のチャレンジ完了' : "Today's Challenge done"}
            </span>
          </div>
        )}

        {/* 本日チャレンジ残数（Free プランは上限ありのため表示） */}
        {dailyPractice && dailyPractice.used > 0 && (
          <div className="flex justify-center">
            <span className={`text-xs px-3 py-1 rounded-full border ${
              dailyPractice.used >= dailyPractice.limit
                ? 'text-gray-500 bg-gray-50 border-gray-200'
                : 'text-amber-700 bg-ground border-line'
            }`}>
              {lang === 'ja'
                ? `本日 ${dailyPractice.used}/${dailyPractice.limit} チャレンジ`
                : `Today ${dailyPractice.used}/${dailyPractice.limit} sessions`}
              {dailyPractice.used >= dailyPractice.limit && dailyPractice.plan === 'free' && (
                <span className="ml-1">— <a href="/settings/billing" className="underline">Starterで上限アップ</a></span>
              )}
            </span>
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
            className="block p-5 rounded-2xl bg-brand hover:bg-brand-deep active:scale-[0.98] transition-all duration-150 shadow-lg shadow-brand/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
                🎯
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-lg">{t('nav_quiz')}</p>
                <p className="text-white/85 text-sm mt-0.5">
                  {!displayTodayDone
                    ? (lang === 'ja' ? '今日はまだ学習していません' : "You haven't studied today")
                    : (lang === 'ja' ? '今日のクイズを続ける' : "Continue today's quiz")}
                </p>
              </div>
              <span className="text-white/70 text-xl flex-shrink-0">›</span>
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
                最初のフレーズをピックしよう 🎸
              </p>
              <p className="text-xs text-violet-500 mt-0.5">
                会話録・記事・字幕からAIがフレーズをピックします
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
                {lang === 'ja' ? `Repick ${displayWeakCount}件` : `${displayWeakCount} Repicks`}
              </p>
              <p className="text-xs text-red-400 mt-0.5">
                {lang === 'ja' ? '苦手なPickを重点的に復習' : 'Focus on your Repicks'}
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
