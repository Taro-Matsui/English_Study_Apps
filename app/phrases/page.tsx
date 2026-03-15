'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Phrase, SourceType, DeleteReason, DELETE_REASON_LABELS } from '@/types'

const SOURCE_TYPES: SourceType[] = ['DSH_Event', 'YouTube', 'Podcast']

const DIFF_CONFIG: Record<number, { label: string; cls: string }> = {
  1: { label: 'Lv.1', cls: 'bg-emerald-100 text-emerald-700' },
  2: { label: 'Lv.2', cls: 'bg-sky-100 text-sky-700' },
  3: { label: 'Lv.3', cls: 'bg-amber-100 text-amber-700' },
  4: { label: 'Lv.4', cls: 'bg-orange-100 text-orange-700' },
  5: { label: 'Lv.5', cls: 'bg-red-100 text-red-700' },
}

const DELETE_REASONS: DeleteReason[] = ['product_name', 'not_phrase']

export default function PhrasesPage() {
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [source, setSource] = useState('')
  const [speaking, setSpeaking] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Phrase | null>(null)
  const [deleteReason, setDeleteReason] = useState<DeleteReason>('product_name')
  const [deleting, setDeleting] = useState(false)

  const fetchPhrases = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (source) params.set('source', source)
    const res = await fetch(`/api/phrases?${params}`)
    const data = await res.json()
    setPhrases(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [q, source])

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

  // 難易度別件数
  const diffCounts = [1,2,3,4,5].map((lv) => ({
    lv,
    count: phrases.filter((p) => p.difficulty === lv).length,
  })).filter((x) => x.count > 0)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-slate-400 hover:text-slate-600 text-lg leading-none">‹</Link>
              <h1 className="text-base font-bold text-slate-800">フレーズ一覧</h1>
            </div>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {loading ? '...' : `${phrases.length}件`}
            </span>
          </div>
          {/* 難易度別件数 */}
          {!loading && diffCounts.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {diffCounts.map(({ lv, count }) => (
                <span key={lv} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${diff(lv).cls}`}>
                  {diff(lv).label}: {count}件
                </span>
              ))}
            </div>
          )}
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="フレーズ・意味で検索..."
            className="h-9 text-sm bg-slate-50 border-slate-200"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
            {['', ...SOURCE_TYPES].map((type) => (
              <button
                key={type || 'all'}
                onClick={() => setSource(type)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  source === type
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type || 'すべて'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 一覧 */}
      <div className="max-w-2xl mx-auto p-4 space-y-2">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-[88px] rounded-2xl bg-slate-200 animate-pulse" />
          ))
        ) : phrases.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-4xl">📭</p>
            <p className="text-sm text-slate-400">フレーズが見つかりません</p>
            {!q && !source && (
              <Link href="/admin/import" className="text-xs text-blue-500 hover:underline">
                インポートして追加 →
              </Link>
            )}
          </div>
        ) : (
          phrases.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900">{p.phrase}</span>
                  {p.pronunciation && (
                    <span className="text-xs text-slate-400">{p.pronunciation}</span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${diff(p.difficulty).cls}`}>
                    {diff(p.difficulty).label}
                  </span>
                </div>
                <p className="text-sm font-medium text-blue-600 mt-1">{p.meaning_ja}</p>
                {p.original_context && (
                  <p className="text-xs text-slate-400 mt-1 italic line-clamp-2">
                    &quot;{p.original_context}&quot;
                  </p>
                )}
                {p.source_title && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{p.source_type}</Badge>
                    <span className="text-[10px] text-slate-400 truncate">{p.source_title}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <button
                  onClick={() => speak(p.phrase, p.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                    speaking === p.id ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  🔊
                </button>
                <button
                  onClick={() => { setDeleteTarget(p); setDeleteReason('product_name') }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-slate-100 text-slate-300 hover:bg-red-50 hover:text-red-400 transition-colors"
                  title="削除"
                >
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-bold text-slate-800">フレーズを削除しますか？</h2>
            <p className="text-sm text-slate-600 font-medium">&ldquo;{deleteTarget.phrase}&rdquo;</p>
            <div className="space-y-2">
              <p className="text-xs text-slate-500 font-medium">削除理由</p>
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
                  <span className="text-sm text-slate-700">{DELETE_REASON_LABELS[r]}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
              >
                {deleting ? '削除中...' : '削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
