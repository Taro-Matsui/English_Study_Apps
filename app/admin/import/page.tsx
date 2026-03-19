'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { SourceType } from '@/types'

type Step = 'upload' | 'submitting' | 'submitted' | 'error'
type ImportMode = 'file' | 'url'

const SOURCE_TYPES: SourceType[] = ['DSH_Event', 'YouTube', 'Podcast', 'Article']
const ACCEPT = '.txt,.vtt,.srt'

export default function AdminImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<ImportMode>('file')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [sourceType, setSourceType] = useState<SourceType>('DSH_Event')
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceDate, setSourceDate] = useState('')
  const [step, setStep] = useState<Step>('upload')
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)

  const isSubmitting = step === 'submitting'
  const canSubmit = mode === 'file' ? !!file : !!url.trim()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
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
      } else {
        if (!url.trim()) { setStep('upload'); return }
        res = await fetch('/api/admin/import-async', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
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
    setFile(null); setUrl('')
    setSourceTitle(''); setSourceDate('')
    setSourceType('DSH_Event')
    setError(null); setJobId(null)
    setStep('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ヘッダー */}
        <div className="flex items-start gap-3">
          <Link href="/" className="mt-1 text-sm text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0">
            ← ホーム
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">フレーズ一括インポート</h1>
            <p className="text-sm text-gray-500 mt-1">
              字幕・テキストファイルまたはURLから英語フレーズを非同期で抽出しDBに登録します
            </p>
          </div>
          <Link
            href="/admin/jobs"
            className="text-xs text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 flex-shrink-0 transition-colors"
          >
            ジョブ一覧 →
          </Link>
        </div>

        {/* フォーム */}
        {(step === 'upload' || step === 'submitting') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">取り込み元と情報を入力</CardTitle>
              <CardDescription>送信後はバックグラウンドでClaudeが処理します。ジョブ一覧で進捗を確認できます。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* モード切り替えタブ */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                {(['file', 'url'] as ImportMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    disabled={isSubmitting}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {m === 'file' ? '📄 ファイル' : '🌐 URL'}
                  </button>
                ))}
              </div>

              {/* ファイル入力 */}
              {mode === 'file' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ファイル <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal ml-1">(.txt / .vtt / .srt)</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT}
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {file && (
                    <p className="text-xs text-gray-500 mt-1">
                      選択中: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              )}

              {/* URL入力 */}
              {mode === 'url' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal ml-1">（記事・ブログ・ドキュメントなど）</span>
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    disabled={isSubmitting}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontSize: '16px' }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    ※ YouTubeの字幕は .vtt/.srt ファイルをダウンロードしてファイルモードでご利用ください
                  </p>
                </div>
              )}

              {/* ソース種別 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ソース種別</label>
                <div className="flex gap-2 flex-wrap">
                  {SOURCE_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSourceType(type)}
                      disabled={isSubmitting}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        sourceType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* タイトル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ソースタイトル
                  <span className="text-gray-400 font-normal ml-1">（省略時はファイル名またはURL）</span>
                </label>
                <input
                  type="text"
                  value={sourceTitle}
                  onChange={(e) => setSourceTitle(e.target.value)}
                  placeholder="例: Snowflake DataSuperhero Summit 2024"
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 日付 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開催日・公開日<span className="text-gray-400 font-normal ml-1">（任意）</span>
                </label>
                <input
                  type="date"
                  value={sourceDate}
                  onChange={(e) => setSourceDate(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 送信ボタン */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'ジョブを送信中...' : 'バックグラウンドで処理を開始する'}
              </button>

              {isSubmitting && <Progress value={null} className="h-1.5 animate-pulse" />}
            </CardContent>
          </Card>
        )}

        {/* 送信完了 */}
        {step === 'submitted' && jobId && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚙</span>
                <div>
                  <p className="text-blue-800 font-semibold">ジョブを受け付けました</p>
                  <p className="text-sm text-blue-600 mt-0.5">
                    Claudeがバックグラウンドでフレーズを抽出中です。ジョブ一覧から進捗を確認してください。
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/admin/jobs/${jobId}`}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  このジョブの状況を確認 →
                </Link>
                <Link
                  href="/admin/jobs"
                  className="rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  ジョブ一覧
                </Link>
                <button
                  onClick={handleReset}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  続けてインポート
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* エラー */}
        {step === 'error' && error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm font-medium text-red-700">エラーが発生しました</p>
              <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>
              <button
                onClick={handleReset}
                className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                最初からやり直す
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
