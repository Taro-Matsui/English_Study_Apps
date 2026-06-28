'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExtractedPhrase } from '@/types'

const DEMO_TEXT_MAX = 3000

const SAMPLE = `Good morning, everyone. Let's kick off today's sprint planning.
First, I'd like to touch base on the deployment pipeline issues we had last week.
The root cause was a race condition in our CI workflow.
Going forward, we should time-box our reviews to keep things moving.
Any blockers before we dive into the backlog?
Let's make sure we're on the same page about the acceptance criteria.`

const DIFF_CLS: Record<number, string> = {
  1: 'bg-emerald-100 text-emerald-700',
  2: 'bg-brand-soft text-brand-deep',
  3: 'bg-amber-100 text-amber-700',
  4: 'bg-orange-100 text-orange-700',
  5: 'bg-red-100 text-red-700',
}

export default function DemoImportPage() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [phrases, setPhrases] = useState<ExtractedPhrase[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleExtract() {
    if (text.trim().length < 50 || loading) return
    setLoading(true)
    setError(null)
    setPhrases(null)

    try {
      const res = await fetch('/api/demo/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? `HTTP ${res.status}`)
      setPhrases(data.phrases)
    } catch (err) {
      setError(err instanceof Error ? err.message : '抽出に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ground p-4 pb-12">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* ヘッダー */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/demo" className="text-sm text-gray-500 hover:text-gray-700">← デモトップ</Link>
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">デモモード</span>
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900">フレーズ抽出体験</h1>
          <p className="text-sm text-gray-500 mt-1">英語テキストを貼り付けると、AI がエンジニア向けフレーズを自動抽出します（最大 {DEMO_TEXT_MAX.toLocaleString()} 文字）</p>
        </div>

        {/* 入力エリア */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value.slice(0, DEMO_TEXT_MAX)); setPhrases(null); setError(null) }}
            placeholder="英語テキストをここに貼り付けてください（会議録・Slackスレッド・技術記事など）"
            rows={7}
            className="w-full text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-xl px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-brand"
            style={{ fontSize: '16px' }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{text.length.toLocaleString()} / {DEMO_TEXT_MAX.toLocaleString()} 文字</span>
            <button
              onClick={() => { setText(SAMPLE); setPhrases(null); setError(null) }}
              className="text-xs px-3 py-1 rounded-lg border border-brand text-brand hover:bg-brand-soft transition-colors"
            >
              💡 サンプルを試す
            </button>
          </div>

          <button
            onClick={handleExtract}
            disabled={text.trim().length < 50 || loading}
            className="w-full bg-brand hover:bg-brand-deep disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            {loading ? 'AI が抽出中…（数秒かかります）' : 'フレーズを抽出する'}
          </button>

          {loading && (
            <div className="h-1 bg-brand-soft rounded-full overflow-hidden">
              <div className="h-full bg-brand animate-pulse rounded-full w-full" />
            </div>
          )}
        </div>

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 抽出結果 */}
        {phrases && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-800">{phrases.length} 件のフレーズが抽出されました</p>
            </div>

            <div className="space-y-2">
              {phrases.map((p, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-3 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm">{p.phrase}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${DIFF_CLS[p.difficulty] ?? DIFF_CLS[1]}`}>
                      Lv.{p.difficulty}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{p.usage_scene}</span>
                  </div>
                  <p className="text-sm text-gray-600">{p.meaning_ja}</p>
                  {p.original_context && (
                    <p className="text-xs text-gray-400 italic">&ldquo;{p.original_context}&rdquo;</p>
                  )}
                </div>
              ))}
            </div>

            {/* 登録 CTA */}
            <div className="bg-brand rounded-2xl p-5 space-y-2 text-center">
              <p className="text-white font-bold">この {phrases.length} 件を保存して学習を始めよう！</p>
              <p className="text-white/85 text-sm">無料登録すると自分のフレーズをクイズで学べます</p>
              <Link
                href="/login"
                className="inline-block mt-2 bg-white text-brand-deep font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-brand-soft transition-colors"
              >
                無料アカウント登録 →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
