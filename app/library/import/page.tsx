'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { SourceType } from '@/types'
import { AdBanner } from '@/components/AdBanner'

type Step = 'upload' | 'submitting' | 'submitted' | 'error'
type ImportMode = 'file' | 'url' | 'text'

const TEXT_MAX = 200_000

const SAMPLE_TEXT = `Good morning, everyone. Let's kick off today's sprint planning.
First, I'd like to touch base on the deployment pipeline issues we had last week.
The root cause was a race condition in our CI workflow.
Going forward, we should time-box our reviews to keep things moving.
Any blockers before we dive into the backlog?
Let's make sure we're on the same page about the acceptance criteria.
I'll circle back after standup to sync on the API contract.`

const SOURCE_TYPES: SourceType[] = ['DSH_Event', 'YouTube', 'Podcast', 'Article']
const ACCEPT = '.txt,.vtt,.srt'

export default function LibraryImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<ImportMode>('file')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('DSH_Event')
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceDate, setSourceDate] = useState('')
  const [step, setStep] = useState<Step>('upload')
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)

  const isSubmitting = step === 'submitting'
  const canSubmit =
    mode === 'file' ? !!file :
    mode === 'url' ? !!url.trim() :
    pasteText.trim().length >= 100

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    setError(null)
  }

  function handleSampleText() {
    const blob = new Blob([SAMPLE_TEXT], { type: 'text/plain' })
    const sampleFile = new File([blob], 'sample_meeting.txt', { type: 'text/plain' })
    setFile(sampleFile)
    setSourceTitle('サンプル会議録')
    setSourceType('DSH_Event')
    setError(null)
  }

  async function handleSubmit() {
    setError(null)
    setStep('submitting')

    try {
      let res: Response

      if (mode === 'file') {
        if (!file) { setStep('upload'); return }
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
    setSourceType('DSH_Event')
    setError(null); setJobId(null)
    setStep('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-amber-50 p-4 md:p-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ヘッダー */}
        <div className="flex items-start gap-3">
          <Link href="/" className="mt-1 text-sm text-amber-700/70 hover:text-amber-700 transition-colors flex-shrink-0">
            ← ホーム
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">フレーズ一括インポート</h1>
            <p className="text-sm text-gray-500 mt-1">
              字幕・テキストファイルまたはURLから英語フレーズを非同期で抽出しDBに登録します
            </p>
          </div>
          <Link
            href="/library/jobs"
            className="text-xs text-amber-700 hover:text-amber-800 border border-amber-200 rounded-lg px-3 py-1.5 flex-shrink-0 transition-colors"
          >
            ジョブ一覧 →
          </Link>
        </div>

        {/* フォーム */}
        {(step === 'upload' || step === 'submitting') && (
          <div className="bg-white/90 rounded-2xl border border-amber-100 shadow-sm">
            <div className="px-6 pt-6 pb-2">
              <h2 className="text-base font-semibold text-amber-900">取り込み元と情報を入力</h2>
              <p className="text-sm text-amber-700/70 mt-1">送信後はバックグラウンドでClaudeが処理します。ジョブ一覧で進捗を確認できます。</p>
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
                    onChange={(e) => setPasteText(e.target.value.slice(0, TEXT_MAX))}
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
                      onClick={() => { setPasteText(SAMPLE_TEXT); setSourceTitle('サンプル会議録'); setSourceType('DSH_Event') }}
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
                    onChange={(e) => setUrl(e.target.value)}
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
                <label className="block text-sm font-medium text-amber-900 mb-1">ソース種別</label>
                <div className="flex gap-2 flex-wrap">
                  {SOURCE_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSourceType(type)}
                      disabled={isSubmitting}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        sourceType === type
                          ? 'bg-amber-800 text-white'
                          : 'bg-white border border-amber-200 text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* タイトル */}
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  ソースタイトル
                  <span className="text-amber-700/60 font-normal ml-1">（省略時はファイル名またはURL）</span>
                </label>
                <input
                  type="text"
                  value={sourceTitle}
                  onChange={(e) => setSourceTitle(e.target.value)}
                  placeholder="例: Snowflake DataSuperhero Summit 2024"
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-amber-200 bg-white text-gray-900 placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* 日付 */}
              <div>
                <label className="block text-sm font-medium text-amber-900 mb-1">
                  開催日・公開日<span className="text-amber-700/60 font-normal ml-1">（任意）</span>
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
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className="w-full rounded-md bg-amber-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'ジョブを送信中...' : 'バックグラウンドで処理を開始する'}
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
                <p className="text-amber-900 font-semibold text-base">処理を受け付けました</p>
                <p className="text-sm text-amber-800">
                  ジョブの実行には数分かかります。後ほどジョブ一覧を確認してください。
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
                  ジョブ一覧を確認する →
                </Link>
                <Link
                  href={`/library/jobs/${jobId}`}
                  className="rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  このジョブの詳細
                </Link>
                <button
                  onClick={handleReset}
                  className="rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  続けてインポート
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
