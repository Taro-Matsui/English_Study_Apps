'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { SourceType } from '@/types'
import { AdBanner } from '@/components/AdBanner'

type Step = 'upload' | 'submitting' | 'submitted' | 'error'
type ImportMode = 'file' | 'url' | 'text'

const TEXT_MAX = 200_000
const HASH_STORAGE_KEY = 'import_hashes'

const SAMPLE_TEXT = `Good morning, everyone. Let's kick off today's sprint planning.
First, I'd like to touch base on the deployment pipeline issues we had last week.
The root cause was a race condition in our CI workflow.
Going forward, we should time-box our reviews to keep things moving.
Any blockers before we dive into the backlog?
Let's make sure we're on the same page about the acceptance criteria.
I'll circle back after standup to sync on the API contract.`

const MODE_OPTIONS: { mode: ImportMode; icon: string; label: string; desc: string; defaultSource: SourceType }[] = [
  { mode: 'file',  icon: '📄', label: 'ファイル',      desc: '.txt / .vtt / .srt',       defaultSource: 'YouTube'  },
  { mode: 'url',   icon: '🌐', label: 'URL',            desc: '英語記事・ドキュメント',    defaultSource: '英語記事' },
  { mode: 'text',  icon: '📋', label: 'テキスト貼り付け', desc: '会議録・Slackログなど',   defaultSource: '議事録'   },
]

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'YouTube',  label: 'YouTube' },
  { value: 'Podcast',  label: 'Podcast' },
  { value: '議事録',   label: '議事録'  },
  { value: '英語記事', label: '英語記事' },
  { value: 'その他',   label: 'その他'  },
]

const ACCEPT = '.txt,.vtt,.srt'

async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text.slice(0, 30_000))
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}
function loadHashes(): string[] {
  try { return JSON.parse(localStorage.getItem(HASH_STORAGE_KEY) ?? '[]') } catch { return [] }
}
function saveHash(hash: string) {
  try {
    const hashes = loadHashes()
    if (!hashes.includes(hash)) localStorage.setItem(HASH_STORAGE_KEY, JSON.stringify([...hashes, hash].slice(-100)))
  } catch {}
}
function titleFromFilename(name: string) { return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() }
function titleFromUrl(urlStr: string) {
  try {
    const u = new URL(urlStr)
    const slug = u.pathname.split('/').filter(Boolean).pop() ?? u.hostname
    return slug.replace(/[_-]+/g, ' ').replace(/\.\w+$/, '').trim() || u.hostname
  } catch { return urlStr.slice(0, 40) }
}
function titleFromText(text: string) { return text.trim().split('\n')[0].slice(0, 30).trim() }

export default function LibraryImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<ImportMode>('file')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('YouTube')
  const [sourceTitle, setSourceTitle] = useState('')
  const [step, setStep] = useState<Step>('upload')
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [dupConfirm, setDupConfirm] = useState(false)
  const pendingHashRef = useRef<string | null>(null)

  // プラン別クォータ表示
  const [quotaInfo, setQuotaInfo] = useState<{ plan: string; used: number; limit: number } | null>(null)

  useEffect(() => {
    // サブスクリプション情報 + フレーズ数を取得してクォータ表示
    Promise.all([
      fetch('/api/stripe/subscription').then((r) => r.json()),
      fetch('/api/phrases/count').then((r) => r.json()).catch(() => null),
    ]).then(([sub, countData]) => {
      const plan: string = sub?.plan ?? 'free'
      const used: number = countData?.count ?? 0
      if (plan === 'free') {
        setQuotaInfo({ plan, used, limit: 60 })
      } else if (plan === 'starter') {
        const rollover: number = countData?.rollover ?? 0
        setQuotaInfo({ plan, used, limit: 300 + rollover })
      }
      // Pro はクォータ表示なし
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const opt = MODE_OPTIONS.find((o) => o.mode === mode)!
    setSourceType(opt.defaultSource)
    setSourceTitle('')
    setFile(null)
    setUrl('')
    setPasteText('')
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [mode])

  const isSubmitting = step === 'submitting'
  const canSubmit =
    mode === 'file' ? !!file :
    mode === 'url' ? !!url.trim() :
    pasteText.trim().length >= 100

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setError(null)
    if (f) setSourceTitle(titleFromFilename(f.name))
  }

  async function submit(skipDupCheck = false) {
    setError(null)
    setStep('submitting')
    try {
      let res: Response
      let hash: string | null = null

      if (mode === 'file') {
        if (!file) { setStep('upload'); return }
        const text = await file.text()
        hash = await hashText(text)
        if (!skipDupCheck && loadHashes().includes(hash)) {
          pendingHashRef.current = hash; setDupConfirm(true); setStep('upload'); return
        }
        const form = new FormData()
        form.append('file', file)
        res = await fetch('/api/admin/import-async', { method: 'POST', body: form })
      } else if (mode === 'url') {
        if (!url.trim()) { setStep('upload'); return }
        res = await fetch('/api/admin/import-async', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        })
      } else {
        const trimmed = pasteText.trim()
        if (!trimmed) { setStep('upload'); return }
        hash = await hashText(trimmed)
        if (!skipDupCheck && loadHashes().includes(hash)) {
          pendingHashRef.current = hash; setDupConfirm(true); setStep('upload'); return
        }
        res = await fetch('/api/admin/import-async', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed, sourceType, sourceTitle: sourceTitle || 'テキスト貼り付け' }),
        })
      }

      const data = await res.json()
      if (res.status === 403 && data.upgrade) {
        // フレーズ上限エラー → アップセル
        setError(data.error ?? 'フレーズ上限に達しました')
        setStep('error')
        return
      }
      if (!res.ok || !data.success) throw new Error(data.error ?? `HTTP ${res.status}`)
      if (hash) saveHash(hash)
      setJobId(data.job_id)
      setStep('submitted')
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー')
      setStep('error')
    }
  }

  function handleReset() {
    setFile(null); setUrl(''); setPasteText('')
    setSourceTitle(''); setError(null); setJobId(null); setDupConfirm(false)
    setStep('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-amber-50 pb-24">

      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-amber-50/95 backdrop-blur-sm border-b border-amber-100">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center gap-2">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-3xl p-3 -ml-3 flex items-center justify-center">‹</Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800">出会いから英語をピックする</p>
            <p className="text-[11px] text-gray-400 leading-tight">会話録・記事・字幕を追加してAIがPickします</p>
          </div>
          <Link href="/library/jobs" className="text-xs text-amber-700 hover:text-amber-800 border border-amber-200 rounded-lg px-3 py-1.5 flex-shrink-0 transition-colors whitespace-nowrap">
            ソース
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* フレーズクォータ表示 */}
        {quotaInfo && (
          <div className={`rounded-xl border p-3 ${
            quotaInfo.used >= quotaInfo.limit
              ? 'bg-red-50 border-red-200'
              : quotaInfo.used >= quotaInfo.limit * 0.8
              ? 'bg-amber-50 border-amber-200'
              : 'bg-white border-amber-100'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-gray-600">
                フレーズ残数
              </span>
              <span className={`text-xs font-bold ${
                quotaInfo.used >= quotaInfo.limit ? 'text-red-600' : 'text-gray-700'
              }`}>
                {quotaInfo.used} / {quotaInfo.limit === Infinity ? '∞' : quotaInfo.limit} 件
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  quotaInfo.used >= quotaInfo.limit ? 'bg-red-500' : 'bg-amber-600'
                }`}
                style={{ width: `${Math.min((quotaInfo.used / quotaInfo.limit) * 100, 100)}%` }}
              />
            </div>
            {quotaInfo.used >= quotaInfo.limit && (
              <div className="mt-2 text-xs text-red-700">
                上限に達しました。
                <a href="/settings/billing" className="font-semibold underline ml-1">
                  Starter にアップグレード →
                </a>
              </div>
            )}
          </div>
        )}

        {/* 重複確認モーダル */}
        {dupConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
              <p className="text-base font-semibold text-gray-900">同じ内容をまたPickしますか？</p>
              <p className="text-sm text-gray-500">このファイル／テキストはすでにPickされています。重複フレーズが生成される場合があります。</p>
              <div className="flex gap-3">
                <button onClick={() => { setDupConfirm(false); submit(true) }}
                  className="flex-1 rounded-xl bg-amber-800 text-white text-sm font-medium py-2.5 hover:bg-amber-700 transition-colors">
                  続けてPickする
                </button>
                <button onClick={() => setDupConfirm(false)}
                  className="flex-1 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium py-2.5 hover:bg-gray-50 transition-colors">
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── メインフォーム ── */}
        {(step === 'upload' || step === 'submitting') && (
          <>
            {/* モード選択 */}
            <div className="grid grid-cols-3 gap-2">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.mode}
                  onClick={() => setMode(opt.mode)}
                  disabled={isSubmitting}
                  className={`flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl border transition-all ${
                    mode === opt.mode
                      ? 'bg-amber-800 border-amber-800 text-white shadow-md'
                      : 'bg-white border-amber-100 text-gray-600 hover:border-amber-300'
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="text-xs font-semibold leading-tight text-center">{opt.label}</span>
                  <span className={`text-[10px] leading-tight text-center ${mode === opt.mode ? 'text-amber-200' : 'text-gray-400'}`}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* コンテンツ入力エリア */}
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">

              {/* ファイル */}
              {mode === 'file' && (
                <div className="p-5 space-y-3">
                  <label className="block">
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      file ? 'border-amber-300 bg-amber-50' : 'border-gray-200 hover:border-amber-300'
                    }`}>
                      {file ? (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-amber-800">{file.name}</p>
                          <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                          <p className="text-xs text-amber-600">別のファイルを選ぶ場合はタップ</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-2xl">📄</p>
                          <p className="text-sm font-medium text-gray-600">ファイルを選択</p>
                          <p className="text-xs text-gray-400">.txt / .vtt / .srt</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPT}
                      onChange={handleFileChange}
                      disabled={isSubmitting}
                      className="sr-only"
                    />
                  </label>
                  <button type="button" onClick={() => {
                    const blob = new Blob([SAMPLE_TEXT], { type: 'text/plain' })
                    const f = new File([blob], 'sample_meeting.txt', { type: 'text/plain' })
                    setFile(f); setSourceTitle('サンプル会議録'); setSourceType('議事録'); setError(null)
                  }} disabled={isSubmitting}
                    className="text-xs text-amber-600 hover:text-amber-800 transition-colors">
                    💡 サンプルを使って試す
                  </button>
                </div>
              )}

              {/* URL */}
              {mode === 'url' && (
                <div className="p-5 space-y-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value)
                      if (e.target.value) setSourceTitle(titleFromUrl(e.target.value))
                    }}
                    placeholder="https://example.com/article"
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                    style={{ fontSize: '16px' }}
                    autoFocus
                  />
                  <p className="text-xs text-gray-400">
                    YouTubeは .vtt/.srt ファイルをダウンロードしてファイルモードをご利用ください
                  </p>
                </div>
              )}

              {/* テキスト貼り付け */}
              {mode === 'text' && (
                <div className="p-5 space-y-2">
                  <textarea
                    value={pasteText}
                    onChange={(e) => {
                      const t = e.target.value.slice(0, TEXT_MAX)
                      setPasteText(t)
                      if (t.length > 10) setSourceTitle(titleFromText(t))
                    }}
                    placeholder="会議録、Slack メッセージ、技術ドキュメントなどを貼り付けてください..."
                    disabled={isSubmitting}
                    rows={7}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
                    style={{ fontSize: '16px' }}
                    autoFocus
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {pasteText.trim().length < 100 && pasteText.length > 0
                        ? <span className="text-amber-500">あと {100 - pasteText.trim().length} 文字以上</span>
                        : `${pasteText.length.toLocaleString()} 文字`}
                    </p>
                    <button type="button" onClick={() => {
                      setPasteText(SAMPLE_TEXT)
                      setSourceTitle('サンプル会議録')
                      setSourceType('議事録')
                    }} disabled={isSubmitting}
                      className="text-xs text-amber-600 hover:text-amber-800 transition-colors">
                      💡 サンプルを試す
                    </button>
                  </div>
                </div>
              )}

              {/* 区切り */}
              <div className="border-t border-gray-100 px-5 py-4 space-y-4">

                {/* コンテンツ種別 */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">コンテンツの種類</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {SOURCE_TYPES.map(({ value, label }) => (
                      <button key={value} onClick={() => setSourceType(value)} disabled={isSubmitting}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          sourceType === value
                            ? 'bg-gray-800 text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ソースタイプ補足ヒント */}
                {sourceType && (() => {
                  const hints: Record<string, string> = {
                    'YouTube': 'YouTube Studioから字幕ファイル（.vtt）をダウンロードし、ファイルで追加してください',
                    'Podcast': 'Whisper・Otter.aiなどで文字起こし後、テキストを貼り付けてください',
                    '議事録': '会議録のテキストをそのまま貼り付けてください',
                    '英語記事': 'URLを入力するか、本文テキストを貼り付けてください',
                    'その他': 'テキストをそのまま貼り付けてください',
                  }
                  const hint = hints[sourceType]
                  return hint ? (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 leading-relaxed">
                      💡 {hint}
                    </p>
                  ) : null
                })()}

                {/* タイトル */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">タイトル</p>
                  <input
                    type="text"
                    value={sourceTitle}
                    onChange={(e) => setSourceTitle(e.target.value)}
                    placeholder="（ファイル名・URLから自動入力）"
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* エラー */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 送信ボタン */}
            <button
              onClick={() => submit()}
              disabled={!canSubmit || isSubmitting}
              className="w-full rounded-2xl bg-amber-800 px-4 py-4 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md shadow-amber-800/20"
            >
              {isSubmitting ? '処理を開始しています...' : 'Pick from Source →'}
            </button>

            {isSubmitting && <Progress value={null} className="h-1 animate-pulse" />}
          </>
        )}

        {/* 送信完了 */}
        {step === 'submitted' && jobId && (
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-semibold text-gray-900">フレーズをPickしています</p>
                <p className="text-sm text-gray-500 mt-1">フレーズの抽出には数分かかります。Sources から確認できます。</p>
              </div>
            </div>
            <AdBanner slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_IMPORT ?? ''} className="rounded-xl" />
            <div className="flex flex-col gap-2">
              <Link href="/library/jobs"
                className="rounded-xl bg-amber-800 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 transition-colors text-center">
                ソースを確認する →
              </Link>
              <div className="flex gap-2">
                <Link href={`/library/jobs/${jobId}`}
                  className="flex-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors text-center">
                  このSourceの詳細
                </Link>
                <button onClick={handleReset}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  続けてPickする
                </button>
              </div>
              <Link href="/quiz"
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors text-center">
                今すぐPracticeで確認する →
              </Link>
            </div>
          </div>
        )}

        {/* エラー完了画面 */}
        {step === 'error' && error && (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-700">エラーが発生しました</p>
                <p className="text-sm text-red-500 mt-1 whitespace-pre-wrap">{error}</p>
              </div>
            </div>
            <button onClick={handleReset}
              className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
              最初からやり直す
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
