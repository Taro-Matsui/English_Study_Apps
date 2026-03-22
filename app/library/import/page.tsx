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

/** モードごとのデフォルトソース種別 */
const MODE_DEFAULT_SOURCE: Record<ImportMode, SourceType> = {
  file:  'YouTube',
  url:   '英語記事',
  text:  '議事録',
}

interface SourceTypeOption {
  value: SourceType
  label: string
  icon: string
}
const SOURCE_TYPE_OPTIONS: SourceTypeOption[] = [
  { value: 'YouTube',  label: 'YouTube（字幕）',      icon: '▶' },
  { value: 'Podcast',  label: 'Podcast（文字起こし）', icon: '🎙' },
  { value: '議事録',   label: '英語の議事録',           icon: '📝' },
  { value: '英語記事', label: '英語記事',               icon: '📰' },
  { value: 'その他',   label: 'その他',                 icon: '•'  },
]

const ACCEPT = '.txt,.vtt,.srt'

/** SHA-256（先頭3万文字）の先頭16文字を返す */
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
    if (!hashes.includes(hash)) {
      hashes.push(hash)
      localStorage.setItem(HASH_STORAGE_KEY, JSON.stringify(hashes.slice(-100)))
    }
  } catch {}
}

/** ファイル名からタイトルを生成（拡張子を除く） */
function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
}

/** URLからタイトルを生成 */
function titleFromUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr)
    const slug = u.pathname.split('/').filter(Boolean).pop() ?? u.hostname
    return slug.replace(/[_-]+/g, ' ').replace(/\.\w+$/, '').trim() || u.hostname
  } catch { return urlStr.slice(0, 40) }
}

/** テキスト先頭から30文字以内のタイトルを生成 */
function titleFromText(text: string): string {
  return text.trim().split('\n')[0].slice(0, 30).trim()
}

export default function LibraryImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<ImportMode>('file')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>(MODE_DEFAULT_SOURCE.file)
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceDate, setSourceDate] = useState('')
  const [step, setStep] = useState<Step>('upload')
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [dupConfirm, setDupConfirm] = useState(false)
  const pendingHashRef = useRef<string | null>(null)

  // モードが切り替わったらソース種別をデフォルトに戻す
  useEffect(() => {
    setSourceType(MODE_DEFAULT_SOURCE[mode])
    setSourceTitle('')
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

  function handleUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUrl(e.target.value)
    setSourceTitle(titleFromUrl(e.target.value))
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const t = e.target.value.slice(0, TEXT_MAX)
    setPasteText(t)
    if (t.length > 10) setSourceTitle(titleFromText(t))
  }

  function handleSampleText() {
    const blob = new Blob([SAMPLE_TEXT], { type: 'text/plain' })
    const sampleFile = new File([blob], 'sample_meeting.txt', { type: 'text/plain' })
    setFile(sampleFile)
    setSourceTitle('サンプル会議録')
    setSourceType('議事録')
    setError(null)
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
          pendingHashRef.current = hash
          setDupConfirm(true)
          setStep('upload')
          return
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
          pendingHashRef.current = hash
          setDupConfirm(true)
          setStep('upload')
          return
        }
        res = await fetch('/api/admin/import-async', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: trimmed,
            sourceType,
            sourceTitle: sourceTitle || 'テキスト貼り付け',
            sourceDate: sourceDate || undefined,
          }),
        })
      }

      const data = await res.json()
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
    setSourceTitle(''); setSourceDate('')
    setSourceType(MODE_DEFAULT_SOURCE[mode])
    setError(null); setJobId(null); setDupConfirm(false)
    setStep('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-amber-50 p-4 md:p-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ヘッダー */}
        <div className="flex items-start gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-3xl p-3 -ml-3 flex items-center justify-center flex-shrink-0">
            ‹
          </Link>
          <div className="flex-1 pt-2">
            <h1 className="text-xl font-bold text-gray-900">テキストを取り込む</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              字幕・文章から英語フレーズを自動で抽出し、学習フレーズに追加します
            </p>
          </div>
          <Link
            href="/library/jobs"
            className="text-xs text-amber-700 hover:text-amber-800 border border-amber-200 rounded-lg px-3 py-1.5 flex-shrink-0 transition-colors mt-2"
          >
            取り込み履歴 →
          </Link>
        </div>

        {/* 重複確認モーダル */}
        {dupConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
              <p className="text-base font-semibold text-gray-900">同じ内容を取り込みますか？</p>
              <p className="text-sm text-gray-500">このファイル/テキストはすでに取り込まれています。再度取り込むと重複フレーズが生成される場合があります。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setDupConfirm(false); submit(true) }}
                  className="flex-1 rounded-lg bg-amber-800 text-white text-sm font-medium py-2 hover:bg-amber-700 transition-colors"
                >
                  続けて取り込む
                </button>
                <button
                  onClick={() => setDupConfirm(false)}
                  className="flex-1 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium py-2 hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* フォーム */}
        {(step === 'upload' || step === 'submitting') && (
          <div className="bg-white/90 rounded-2xl border border-amber-100 shadow-sm">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-base font-semibold text-amber-900">取り込み元を選択</h2>
              <p className="text-sm text-amber-700/70 mt-1">送信後はバックグラウンドで処理します。取り込み履歴で進捗を確認できます。</p>
            </div>
            <div className="px-6 pb-6 space-y-4">

              {/* モード切り替えタブ */}
              <div className="flex gap-1 bg-amber-100/60 p-1 rounded-xl w-fit flex-wrap">
                {([['file', '📄 ファイル'], ['url', '🌐 URL'], ['text', '📋 テキスト貼り付け']] as [ImportMode, string][]).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    disabled={isSubmitting}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-amber-800/60 hover:text-amber-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* ファイル入力 */}
              {mode === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-1">
                    ファイル <span className="text-red-500">*</span>
                    <span className="text-amber-700/60 font-normal ml-1">(.txt / .vtt / .srt)</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT}
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="block w-full text-sm text-amber-900 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 cursor-pointer"
                  />
                  {file && (
                    <p className="text-xs text-gray-500 mt-1">
                      選択中: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleSampleText}
                    disabled={isSubmitting}
                    className="mt-2 text-xs px-3 py-1.5 rounded-md border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
                  >
                    💡 サンプルテキストを試す
                  </button>
                </div>
              )}

              {/* テキスト貼り付け */}
              {mode === 'text' && (
                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-1">
                    テキストを貼り付け <span className="text-red-500">*</span>
                    <span className="text-amber-700/60 font-normal ml-1">（100文字以上）</span>
                  </label>
                  <textarea
                    value={pasteText}
                    onChange={handleTextChange}
                    placeholder="会議録、Slack メッセージ、技術ドキュメントなどを貼り付けてください..."
                    disabled={isSubmitting}
                    rows={8}
                    className="w-full rounded-md border border-amber-200 bg-white text-gray-900 placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
                    style={{ fontSize: '16px' }}
                  />
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-400">
                      {pasteText.length.toLocaleString()} / {TEXT_MAX.toLocaleString()} 文字
                      {pasteText.trim().length < 100 && pasteText.length > 0 && (
                        <span className="text-red-400 ml-2">あと {100 - pasteText.trim().length} 文字以上入力してください</span>
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setPasteText(SAMPLE_TEXT); setSourceTitle('サンプル会議録'); setSourceType('議事録') }}
                      disabled={isSubmitting}
                      className="text-xs px-3 py-1 rounded-md border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition-colors"
                    >
                      💡 サンプルを試す
                    </button>
                  </div>
                </div>
              )}

              {/* URL入力 */}
              {mode === 'url' && (
                <div>
                  <label className="block text-sm font-medium text-amber-900 mb-1">
                    URL <span className="text-red-500">*</span>
                    <span className="text-amber-700/60 font-normal ml-1">（記事・ブログ・ドキュメントなど）</span>
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={handleUrlChange}
                    placeholder="https://example.com/article"
                    disabled={isSubmitting}
                    className="w-full rounded-md border border-amber-200 bg-white text-gray-900 placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                    style={{ fontSize: '16px' }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    ※ YouTubeの字幕は .vtt/.srt ファイルをダウンロードしてファイルモードでご利用ください
                  </p>
                </div>
              )}

              {/* ソース種別 */}
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">コンテンツの種類</label>
                <div className="flex gap-2 flex-wrap">
                  {SOURCE_TYPE_OPTIONS.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => setSourceType(value)}
                      disabled={isSubmitting}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                        sourceType === value
                          ? 'bg-amber-800 text-white'
                          : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      <span className="text-xs">{icon}</span>{label}
                    </button>
                  ))}
                </div>
              </div>

              {/* タイトル */}
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  タイトル
                  <span className="text-amber-700/60 font-normal ml-1">（自動入力されます）</span>
                </label>
                <input
                  type="text"
                  value={sourceTitle}
                  onChange={(e) => setSourceTitle(e.target.value)}
                  placeholder="例: sprint planning meeting"
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-amber-200 bg-white text-gray-900 placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* 日付 */}
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  日付<span className="text-amber-700/60 font-normal ml-1">（任意）</span>
                </label>
                <input
                  type="date"
                  value={sourceDate}
                  onChange={(e) => setSourceDate(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-amber-200 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* 送信ボタン */}
              <button
                onClick={() => submit()}
                disabled={!canSubmit || isSubmitting}
                className="w-full rounded-md bg-amber-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? '処理を開始しています...' : 'フレーズを抽出する'}
              </button>

              {isSubmitting && <Progress value={null} className="h-1.5 animate-pulse" />}
            </div>
          </div>
        )}

        {/* 送信完了 */}
        {step === 'submitted' && jobId && (
          <div className="bg-white/90 rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
            <div className="px-6 pt-6 pb-6 space-y-4">
              <div className="space-y-1">
                <p className="text-amber-900 font-semibold text-base">取り込みを受け付けました</p>
                <p className="text-sm text-amber-800">
                  フレーズの抽出には数分かかります。後ほど取り込み履歴を確認してください。
                </p>
              </div>
              <AdBanner
                slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_IMPORT ?? ''}
                className="rounded-xl -mx-1"
              />
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/library/jobs"
                  className="rounded-md bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors"
                >
                  取り込み履歴を確認する →
                </Link>
                <Link
                  href={`/library/jobs/${jobId}`}
                  className="rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  この取り込みの詳細
                </Link>
                <button
                  onClick={handleReset}
                  className="rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  続けて取り込む
                </button>
                <Link
                  href="/quiz"
                  className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                >
                  今すぐクイズで確認する →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* エラー */}
        {step === 'error' && error && (
          <div className="bg-white/90 rounded-2xl border border-red-200 bg-red-50 shadow-sm">
            <div className="px-6 pt-6 pb-6 space-y-3">
              <p className="text-sm font-medium text-red-700">エラーが発生しました</p>
              <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>
              <button
                onClick={handleReset}
                className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                最初からやり直す
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
