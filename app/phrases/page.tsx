'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Phrase, SourceType, DeleteReason } from '@/types'
import { useLanguage, LangToggle } from '@/lib/i18n'
import { useSettings } from '@/lib/settings'

const SOURCE_TYPES: SourceType[] = ['DSH_Event', 'YouTube', 'Podcast']
const DELETE_REASONS: DeleteReason[] = ['product_name', 'not_phrase']
const SCENES = ['daily', 'technical', 'business', 'other'] as const
type SceneFilter = typeof SCENES[number] | ''

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
  const { lang, t } = useLanguage()
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

  const fetchPhrases = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (source) params.set('source', source)
    if (diffFilter !== null) params.set('difficulty', String(diffFilter))
    if (sceneFilter) params.set('scene', sceneFilter)
    const res = await fetch(`/api/phrases?${params}`)
    const data = await res.json()
    setPhrases(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [q, source, diffFilter, sceneFilter])

  useEffect(() => {
    const id = setTimeout(fetchPhrases, 300)
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

  const displayedPhrases = onlyUnmastered
    ? phrases.filter((p) => !masteredSet.has(p.id))
    : phrases

  const masteredCount = phrases.filter((p) => masteredSet.has(p.id)).length
  const countLabel = lang === 'ja' ? `${displayedPhrases.length}件` : `${displayedPhrases.length} phrases`

  const hasFilters = !!q || !!source || diffFilter !== null || !!sceneFilter || onlyUnmastered

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 pb-24">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-100 dark:border-white/5 px-4 py-3">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 text-2xl p-2 -ml-2">‹</Link>
              <h1 className="text-base font-bold text-gray-800 dark:text-white">{t('phrases_title')}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                {loading ? '...' : countLabel}
              </span>
              {masteredCount > 0 && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
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
            className="h-9 text-sm bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
          />

          {/* 難易度フィルター */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            <button
              onClick={() => setDiffFilter(null)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                diffFilter === null ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('phrases_all')}
            </button>
            {[1,2,3,4,5].map((lv) => (
              <button
                key={lv}
                onClick={() => setDiffFilter(diffFilter === lv ? null : lv)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  diffFilter === lv ? `${DIFF_CONFIG[lv].cls} ring-1 ring-current` : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                  sceneFilter === sc ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                    ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900'
                    : type === '' ? 'hidden' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {type}
              </button>
            ))}
            <button
              onClick={() => setOnlyUnmastered(!onlyUnmastered)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                onlyUnmastered ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              未習得のみ
            </button>
            {hasFilters && (
              <button
                onClick={() => { setDiffFilter(null); setSceneFilter(''); setSource(''); setOnlyUnmastered(false); setQ('') }}
                className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors whitespace-nowrap"
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
            <div key={i} className="h-[88px] rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
          ))
        ) : displayedPhrases.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-4xl">📭</p>
            <p className="text-sm text-gray-400 dark:text-slate-400">{t('phrases_empty')}</p>
            {!hasFilters && (
              <Link href="/library/import" className="text-xs text-blue-500 hover:underline">
                {t('phrases_import_link')}
              </Link>
            )}
          </div>
        ) : (
          displayedPhrases.map((p) => {
            const isMastered = masteredSet.has(p.id)
            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow ${
                  isMastered ? 'border-emerald-200 dark:border-emerald-700' : 'border-gray-100 dark:border-gray-700'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 dark:text-white">{p.phrase}</span>
                    {settings.showPronunciation && p.pronunciation && (
                      <span className="text-xs text-gray-400 dark:text-slate-400">{p.pronunciation}</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${diff(p.difficulty).cls}`}>
                      {diff(p.difficulty).label}
                    </span>
                    {isMastered && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                        ✓ 習得済み
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">{p.meaning_ja}</p>
                  {p.original_context && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 italic line-clamp-2">
                      &quot;{p.original_context}&quot;
                    </p>
                  )}
                  {p.source_title && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{p.source_type}</Badge>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 truncate">{p.source_title}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => speak(p.phrase, p.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                      speaking === p.id ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 animate-pulse' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    🔊
                  </button>
                  <button
                    onClick={() => { setDeleteTarget(p); setDeleteReason('product_name') }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-400 transition-colors"
                    title="削除"
                  >
                    🗑
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-bold text-gray-800 dark:text-white">{t('phrases_delete_title')}</h2>
            <p className="text-sm text-gray-600 dark:text-slate-300 font-medium">&ldquo;{deleteTarget.phrase}&rdquo;</p>
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{t('phrases_delete_reason')}</p>
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
                  <span className="text-sm text-gray-700 dark:text-slate-300">
                    {t(`reason_${r}` as 'reason_product_name' | 'reason_not_phrase')}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-gray-200 dark:border-gray-600 py-2 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
