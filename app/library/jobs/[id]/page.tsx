'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ExtractedPhrase, SourceType, SaveResponse } from '@/types'

interface Job {
  id: string
  type: 'file' | 'url'
  source_name: string | null
  status: 'pending' | 'processing' | 'done' | 'error'
  phrase_count: number | null
  phrases: ExtractedPhrase[] | null
  error_text: string | null
  created_at: string
  completed_at: string | null
}

const SOURCE_TYPES: SourceType[] = ['DSH_Event', 'YouTube', 'Podcast', 'Article']

const STATUS_CONFIG = {
  pending:    { label: '待機中',  cls: 'text-slate-400',   icon: '⏳' },
  processing: { label: '処理中',  cls: 'text-amber-400',   icon: '⚙' },
  done:       { label: '完了',    cls: 'text-emerald-400', icon: '✓' },
  error:      { label: 'エラー',  cls: 'text-red-400',     icon: '✗' },
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function LibraryJobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [phrases, setPhrases] = useState<ExtractedPhrase[]>([])
  const [sourceType, setSourceType] = useState<SourceType>('Article')
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceDate, setSourceDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ inserted: number; updated: number; skipped: number } | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/jobs/${id}`)
      if (!res.ok) { setError('ジョブが見つかりません'); setLoading(false); return }
      const data: Job = await res.json()
      setJob(data)
      if (data.status === 'done' && data.phrases) {
        setPhrases((prev) => prev.length ? prev : data.phrases!)
        setSourceTitle((prev) => prev || data.source_name || '')
      }
    } catch {
      setError('読み込みに失敗しました')
    }
    setLoading(false)
  }, [id])

  useEffect(() => { fetchJob() }, [fetchJob])

  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'error') return
    const timer = setInterval(fetchJob, 3_000)
    return () => clearInterval(timer)
  }, [job, fetchJob])

  async function handleCancel() {
    if (!job || cancelling) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/admin/jobs/${id}`, { method: 'PATCH' })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error ?? 'キャンセルに失敗しました')
      } else {
        await fetchJob()
      }
    } catch {
      setError('通信エラーが発生しました')
    }
    setCancelling(false)
  }

  async function handleSave() {
    if (!phrases.length) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrases,
          source_type: sourceType,
          source_title: sourceTitle || job?.source_name || '',
          source_date: sourceDate || undefined,
        }),
      })
      const data: SaveResponse = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? `HTTP ${res.status}`)
      setSaveResult({ inserted: data.inserted_count, updated: data.updated_count ?? 0, skipped: data.skipped_count ?? 0 })
      setPhrases([])
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-slate-500 text-sm animate-pulse">読み込み中...</p>
    </div>
  )

  if (error && !job) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
      <p className="text-red-400 text-sm">{error}</p>
      <Link href="/library/jobs" className="text-blue-400 text-sm hover:underline">← 一覧に戻る</Link>
    </div>
  )

  const sc = job ? STATUS_CONFIG[job.status] : null
  const extractedPhrases = phrases.filter((p) => !p.suggested)
  const suggestedPhrases = phrases.filter((p) => p.suggested)

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-24">
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-white/5">
        <div className="px-4 pt-3 pb-3 flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/library/jobs" className="text-slate-500 hover:text-slate-300 text-lg px-1 -ml-1">‹</Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{job?.source_name ?? 'ジョブ詳細'}</p>
            {job && (
              <p className="text-xs text-slate-500">
                {formatTime(job.created_at)}
                {job.completed_at && ` → ${formatTime(job.completed_at)}`}
              </p>
            )}
          </div>
          {sc && (
            <span className={`text-xs font-medium flex-shrink-0 ${sc.cls}`}>
              {sc.icon} {sc.label}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 pb-12 max-w-2xl mx-auto space-y-5">

        {(job?.status === 'pending' || job?.status === 'processing') && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-6 text-center space-y-3">
            <p className="text-2xl animate-spin">⚙</p>
            <p className="text-amber-400 font-semibold text-sm">Claude APIでフレーズを抽出中...</p>
            <p className="text-slate-500 text-xs">自動的に更新されます。このページを開いたままにしてください。</p>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelling ? 'キャンセル中...' : 'ジョブをキャンセル'}
            </button>
          </div>
        )}

        {job?.status === 'error' && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 space-y-2">
            <p className="text-red-400 font-semibold text-sm">処理に失敗しました</p>
            <p className="text-red-300 text-xs">{job.error_text}</p>
            <Link href="/library/import" className="text-blue-400 text-xs hover:underline block mt-2">
              インポートをやり直す →
            </Link>
          </div>
        )}

        {saveResult && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-2">
            <p className="text-emerald-400 font-semibold text-sm">
              ✓ {saveResult.inserted}件を新規登録
              {saveResult.updated > 0 && `、${saveResult.updated}件を更新`}
            </p>
            {saveResult.skipped > 0 && (
              <p className="text-slate-400 text-xs">{saveResult.skipped}件はスキップ</p>
            )}
            <div className="flex gap-2 mt-2 flex-wrap">
              <Link href="/quiz" className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors font-medium">今すぐクイズで確認する →</Link>
              <Link href="/library/import" className="text-xs text-blue-400 hover:underline self-center">続けてインポート →</Link>
              <Link href="/" className="text-xs text-slate-400 hover:underline self-center">ホームへ →</Link>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-xs">{error}</p>}

        {job?.status === 'done' && phrases.length > 0 && !saveResult && (
          <>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ソース情報</h2>
              <div className="flex gap-2 flex-wrap">
                {SOURCE_TYPES.map((t) => (
                  <button key={t} onClick={() => setSourceType(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      sourceType === t ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-400 hover:bg-white/20'
                    }`}>{t}</button>
                ))}
              </div>
              <input
                type="text"
                value={sourceTitle}
                onChange={(e) => setSourceTitle(e.target.value)}
                placeholder="ソースタイトル（省略可）"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                style={{ fontSize: '16px' }}
              />
              <input
                type="date"
                value={sourceDate}
                onChange={(e) => setSourceDate(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  フレーズ <span className="text-slate-400">({phrases.length}件)</span>
                  {suggestedPhrases.length > 0 && (
                    <span className="ml-2 text-xs text-violet-400">うち提案 {suggestedPhrases.length}件</span>
                  )}
                </h2>
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {extractedPhrases.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">テキストから抽出 ({extractedPhrases.length}件)</p>
                    {extractedPhrases.map((p) => (
                      <PhraseRow key={p.phrase} phrase={p} onRemove={() => setPhrases((prev) => prev.filter((x) => x !== p))} disabled={saving} />
                    ))}
                  </div>
                )}
                {suggestedPhrases.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-violet-400 uppercase tracking-wider">✨ AI提案 ({suggestedPhrases.length}件)</p>
                    {suggestedPhrases.map((p) => (
                      <PhraseRow key={p.phrase} phrase={p} suggested onRemove={() => setPhrases((prev) => prev.filter((x) => x !== p))} disabled={saving} />
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={phrases.length === 0 || saving}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? '登録中...' : `${phrases.length}件をDBに登録する`}
              </button>
            </div>
          </>
        )}

        {job?.status === 'done' && phrases.length === 0 && !saveResult && (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">フレーズが0件です</p>
            <Link href="/library/import" className="text-blue-400 text-sm hover:underline mt-2 inline-block">
              インポートに戻る →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function PhraseRow({
  phrase: p,
  suggested = false,
  onRemove,
  disabled,
}: {
  phrase: ExtractedPhrase
  suggested?: boolean
  onRemove: () => void
  disabled: boolean
}) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${suggested ? 'border-violet-500/20 bg-violet-500/5' : 'border-white/10 bg-white/5'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-white">{p.phrase}</span>
          {p.pronunciation && <span className="text-xs text-slate-500">{p.pronunciation}</span>}
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-400">Lv.{p.difficulty}</span>
          {suggested && <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">提案</span>}
        </div>
        <p className="text-xs text-blue-400 mt-0.5">{p.meaning_ja}</p>
        {p.original_context && (
          <p className="text-xs text-slate-500 mt-1 italic truncate">&quot;{p.original_context}&quot;</p>
        )}
      </div>
      <button
        onClick={onRemove}
        disabled={disabled}
        className="text-slate-600 hover:text-red-400 disabled:opacity-30 transition-colors text-lg leading-none flex-shrink-0"
      >
        ×
      </button>
    </div>
  )
}
