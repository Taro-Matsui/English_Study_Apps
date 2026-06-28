'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Phrase, SourceType, DeleteReason } from '@/types'
import { useLanguage, LangToggle } from '@/lib/i18n'
import { useSettings } from '@/lib/settings'

const SOURCE_TYPES: SourceType[] = ['YouTube', 'Podcast', '議事録', '英語記事', 'その他']
const DELETE_REASONS: DeleteReason[] = ['product_name', 'not_phrase']
const SCENES = ['daily', 'technical', 'business', 'other'] as const
type SceneFilter = typeof SCENES[number] | ''

const PHRASES_CACHE_KEY = 'phrases_cache'
const PAGE_SIZE = 30

const DIFF_CONFIG: Record<number, { label: string; cls: string }> = {
  1: { label: 'Lv.1', cls: 'bg-emerald-100 text-emerald-700' },
  2: { label: 'Lv.2', cls: 'bg-sky-100 text-sky-700' },
  3: { label: 'Lv.3', cls: 'bg-amber-100 text-amber-700' },
  4: { label: 'Lv.4', cls: 'bg-orange-100 text-orange-700' },
  5: { label: 'Lv.5', cls: 'bg-red-100 text-red-700' },
}

const SCENE_LABELS: Record<string, string> = {
  daily: '日常', technical: '技術', business: 'ビジネス', other: 'その他',
}

export default function PhrasesPage() {
  const { t } = useLanguage()
  const { settings } = useSettings()
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [source, setSource] = useState('')
  const [diffFilter, setDiffFilter] = useState<number | null>(null)
  const [sceneFilter, setSceneFilter] = useState<SceneFilter>('')
  const [onlyUnmastered, setOnlyUnmastered] = useState(false)
  const [speaking, setSpeaking] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Phrase | null>(null)
  const [deleteReason, setDeleteReason] = useState<DeleteReason>('product_name')
  const [deleting, setDeleting] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const noFilters = !q && !source && diffFilter === null && !sceneFilter

  const fetchPhrases = useCallback(async () => {
    // フィルターなし初回: キャッシュから即時表示
    if (noFilters) {
      try {
        const raw = localStorage.getItem(PHRASES_CACHE_KEY)
        if (raw) {
          const cached = JSON.parse(raw) as Phrase[]
          if (Array.isArray(cached) && cached.length) {
            setPhrases(cached)
            setLoading(false)
          }
        }
      } catch {}
    } else {
      setLoading(true)
    }

    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (source) params.set('source', source)
    if (diffFilter !== null) params.set('difficulty', String(diffFilter))
    if (sceneFilter) params.set('scene', sceneFilter)
    const res = await fetch(`/api/phrases?${params}`)
    const data = await res.json()
    const result = Array.isArray(data) ? data : []
    setPhrases(result)
    setLoading(false)
    setVisibleCount(PAGE_SIZE)

    // フィルターなし結果をキャッシュ
    if (noFilters) {
      try { localStorage.setItem(PHRASES_CACHE_KEY, JSON.stringify(result)) } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, source, diffFilter, sceneFilter])

  useEffect(() => {
    const id = setTimeout(fetchPhrases, q ? 300 : 0)
    return () => clearTimeout(id)
  }, [fetchPhrases])

  function speak(text: string, id: string) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'en-US'; utt.rate = 0.88
    utt.onend = () => setSpeaking(null)
    setSpeaking(id)
    window.speechSynthesis.speak(utt)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    await fetch(`/api/phrases/${deleteTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delete_reason: deleteReason }),
    })
    setPhrases((prev) => prev.filter((p) => p.id !== deleteTarget.id))
    setDeleteTarget(null)
    setDeleting(false)
  }

  const diff = (d: number) => DIFF_CONFIG[d] ?? DIFF_CONFIG[3]

  const masteredSet = new Set(settings.masteredIds)

  const filteredPhrases = onlyUnmastered
    ? phrases.filter((p) => !masteredSet.has(p.id))
    : phrases

  const displayedPhrases = filteredPhrases.slice(0, visibleCount)
  const hasMore = filteredPhrases.length > visibleCount

  const masteredCount = phrases.filter((p) => masteredSet.has(p.id)).length
  const countLabel = `${filteredPhrases.length} Picks`

  const hasFilters = !!q || !!source || diffFilter !== null || !!sceneFilter || onlyUnmastered

  return (
    <div className="min-h-screen bg-ground pb-24">
      <div className="sticky top-0 z-10 bg-ground/95 backdrop-blur-sm border-b border-line px-4 py-3">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-gray-400 hover:text-gray-600 text-2xl p-2 -ml-2">‹</Link>
              <h1 className="text-base font-bold text-gray-800">{t('phrases_title')}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-brand bg-brand-soft px-2 py-0.5 rounded-full">
                {loading ? '...' : countLabel}
              </span>
              {masteredCount > 0 && (
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  ✓ {masteredCount}
                </span>
              )}
              <LangToggle />
            </div>
          </div>

          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('phrases_search')}
            className="h-9 text-sm bg-white border-line text-gray-900 placeholder-gray-300"
          />

          {/* 難易度フィルター */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            <button
              onClick={() => setDiffFilter(null)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                diffFilter === null ? 'bg-brand text-white' : 'bg-white border border-line text-brand hover:bg-ground'
              }`}
            >
              {t('phrases_all')}
            </button>
            {[1,2,3,4,5].map((lv) => (
              <button
                key={lv}
                onClick={() => setDiffFilter(diffFilter === lv ? null : lv)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  diffFilter === lv ? `${DIFF_CONFIG[lv].cls} ring-1 ring-current` : 'bg-white border border-line text-brand hover:bg-ground'
                }`}
              >
                Lv.{lv}
              </button>
            ))}
          </div>

          {/* シーン + ソース + 未習得フィルター */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {SCENES.map((sc) => (
              <button
                key={sc}
                onClick={() => setSceneFilter(sceneFilter === sc ? '' : sc)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  sceneFilter === sc ? 'bg-brand text-white' : 'bg-white border border-line text-brand hover:bg-ground'
                }`}
              >
                {SCENE_LABELS[sc]}
              </button>
            ))}
            {['', ...SOURCE_TYPES].map((type) => (
              <button
                key={type || 'all-src'}
                onClick={() => setSource(source === type ? '' : type)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  source === type && type !== ''
                    ? 'bg-brand text-white'
                    : type === '' ? 'hidden' : 'bg-white border border-line text-brand hover:bg-ground'
                }`}
              >
                {type}
              </button>
            ))}
            <button
              onClick={() => setOnlyUnmastered(!onlyUnmastered)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                onlyUnmastered ? 'bg-brand text-white' : 'bg-white border border-line text-brand hover:bg-ground'
              }`}
            >
              Unpicked のみ
            </button>
            {hasFilters && (
              <button
                onClick={() => { setDiffFilter(null); setSceneFilter(''); setSource(''); setOnlyUnmastered(false); setQ('') }}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-400 hover:bg-red-100 transition-colors whitespace-nowrap"
              >
                ✕ クリア
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-2">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-[88px] rounded-2xl bg-line animate-pulse" />
          ))
        ) : displayedPhrases.length === 0 ? (
          <div className="flex flex-col items-center py-12 space-y-4 text-center">
            <div className="w-48 h-48 relative opacity-90">
              <Image
                src="/pick_logo.png"
                alt="フレーズがありません"
                width={192}
                height={192}
                className="object-contain drop-shadow-md"
                priority
              />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold text-gray-900">
                {hasFilters ? 'フレーズが見つかりません' : 'まだPickがありません'}
              </p>
              <p className="text-sm text-gray-500">
                {hasFilters
                  ? 'フィルターを変えて試してみましょう'
                  : '会話録や記事から\n英語フレーズをPickしよう！'}
              </p>
            </div>
            {!hasFilters && (
              <Link
                href="/library/import"
                className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-deep transition-colors shadow-sm"
              >
                フレーズをPickする →
              </Link>
            )}
          </div>
        ) : (
          <>
            {displayedPhrases.map((p) => {
              const isMastered = masteredSet.has(p.id)
              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow ${
                    isMastered ? 'border-emerald-200' : 'border-line'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900">{p.phrase}</span>
                      {settings.showPronunciation && p.pronunciation && (
                        <span className="text-xs text-gray-400">{p.pronunciation}</span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${diff(p.difficulty).cls}`}>
                        {diff(p.difficulty).label}
                      </span>
                      {isMastered && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">
                          ✓ Picked
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-brand mt-1">{p.meaning_ja}</p>
                    {p.original_context && (
                      <p className="text-xs text-gray-400 mt-1 italic line-clamp-2">
                        &quot;{p.original_context}&quot;
                      </p>
                    )}
                    {p.source_title && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{p.source_type}</Badge>
                        <span className="text-[10px] text-gray-400 truncate">{p.source_title}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => speak(p.phrase, p.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                        speaking === p.id ? 'bg-brand-soft text-brand animate-pulse' : 'bg-ground text-brand hover:bg-brand-soft'
                      }`}
                    >
                      🔊
                    </button>
                    <button
                      onClick={() => { setDeleteTarget(p); setDeleteReason('product_name') }}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-gray-100 text-gray-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                      title="削除"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              )
            })}
            {hasMore && (
              <button
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="w-full py-3 rounded-2xl border border-line bg-white text-brand text-sm font-medium hover:bg-ground transition-colors"
              >
                もっと見る（残り {filteredPhrases.length - visibleCount} 件）
              </button>
            )}
          </>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-ground rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-bold text-gray-800">{t('phrases_delete_title')}</h2>
            <p className="text-sm text-gray-600 font-medium">&ldquo;{deleteTarget.phrase}&rdquo;</p>
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">{t('phrases_delete_reason')}</p>
              {DELETE_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="delete_reason"
                    value={r}
                    checked={deleteReason === r}
                    onChange={() => setDeleteReason(r)}
                    className="accent-red-500"
                  />
                  <span className="text-sm text-gray-700">
                    {t(`reason_${r}` as 'reason_product_name' | 'reason_not_phrase')}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-line py-2 text-sm text-brand hover:bg-ground transition-colors"
              >
                {t('phrases_cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? t('phrases_deleting') : t('phrases_delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
