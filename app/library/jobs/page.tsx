'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatTime } from '@/lib/utils'

interface Job {
  id: string
  type: 'file' | 'url'
  source_name: string | null
  status: 'pending' | 'processing' | 'done' | 'error'
  phrase_count: number | null
  error_text: string | null
  created_at: string
  completed_at: string | null
}

const STATUS_CONFIG = {
  pending:    { label: '待機中',  cls: 'bg-amber-100 text-amber-600' },
  processing: { label: '処理中',  cls: 'bg-amber-500/20 text-amber-400 animate-pulse' },
  done:       { label: '完了',    cls: 'bg-emerald-500/20 text-emerald-400' },
  error:      { label: 'エラー',  cls: 'bg-red-500/20 text-red-400' },
}


export default function LibraryJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)

  async function fetchJobs() {
    try {
      const res = await fetch('/api/admin/jobs')
      const data = await res.json()
      if (!res.ok || !Array.isArray(data)) {
        setApiError(data?.error ?? `HTTP ${res.status}`)
        setLoading(false)
        return
      }
      setApiError(null)
      setJobs(data)
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'ネットワークエラー')
    }
    setLoading(false)
  }

  // 初回ロード
  useEffect(() => { fetchJobs() }, [])
  // アクティブなジョブがある間だけポーリング
  const hasActive = jobs.some((j) => j.status === 'pending' || j.status === 'processing')
  useEffect(() => {
    if (!hasActive) return
    const timer = setInterval(() => fetchJobs(), 5_000)
    return () => clearInterval(timer)
  }, [hasActive])

  return (
    <div className="min-h-screen bg-amber-50 text-gray-900 pb-24">
      <div className="sticky top-0 z-10 bg-amber-50/95 backdrop-blur-sm border-b border-amber-100">
        <div className="px-4 pt-3 pb-3 flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/library/import" className="text-gray-400 hover:text-gray-600 text-3xl p-3 -ml-3 flex items-center justify-center">‹</Link>
          <h1 className="flex-1 text-sm font-semibold">ソース</h1>
          <button
            onClick={fetchJobs}
            className="text-xs px-3 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
          >
            更新
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-10 max-w-2xl mx-auto">
        {hasActive && (
          <p className="text-xs text-amber-500 mb-3 animate-pulse">
            ● Source を処理中です。自動的に更新されます。
          </p>
        )}

        {loading && (
          <p className="text-gray-400 text-sm animate-pulse">読み込み中...</p>
        )}

        {!loading && apiError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
            <p className="text-red-500 font-semibold text-sm">ジョブ一覧の取得に失敗しました</p>
            <p className="text-red-400 text-xs">{apiError}</p>
          </div>
        )}

        {!loading && !apiError && jobs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">まだ Source がありません</p>
            <Link href="/library/import" className="text-amber-700 text-sm hover:underline mt-2 inline-block">
              英語をピックする →
            </Link>
          </div>
        )}

        <div className="space-y-2">
          {jobs.map((job) => {
            const sc = STATUS_CONFIG[job.status]
            return (
              <Link
                key={job.id}
                href={`/library/jobs/${job.id}`}
                className="flex items-center gap-3 p-4 rounded-xl border border-amber-100 bg-white/90 hover:bg-amber-50/50 transition-colors"
              >
                <span className="text-lg">{job.type === 'file' ? '📄' : '🌐'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {job.source_name ?? '(不明)'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatTime(job.created_at)}
                    {job.completed_at && ` → ${formatTime(job.completed_at)}`}
                    {job.status === 'done' && job.phrase_count !== null && (
                      <span className="ml-2 text-emerald-500">{job.phrase_count}件</span>
                    )}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${sc.cls}`}>
                  {sc.label}
                </span>
                <span className="text-gray-300 flex-shrink-0">›</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
