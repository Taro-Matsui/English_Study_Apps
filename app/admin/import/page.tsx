'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ExtractedPhrase, ExtractResponse, SaveResponse, SourceType } from '@/types'

type Step = 'upload' | 'extracting' | 'preview' | 'saving' | 'done' | 'error'

const SOURCE_TYPES: SourceType[] = ['DSH_Event', 'YouTube', 'Podcast']
const ACCEPT = '.txt,.vtt,.srt'

export default function AdminImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [sourceType, setSourceType] = useState<SourceType>('DSH_Event')
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceDate, setSourceDate] = useState('')
  const [step, setStep] = useState<Step>('upload')
  const [phrases, setPhrases] = useState<ExtractedPhrase[]>([])
  const [error, setError] = useState<string | null>(null)
  const [insertedCount, setInsertedCount] = useState(0)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setError(null)
  }

  async function handleExtract() {
    if (!file) return
    setError(null)
    setStep('extracting')

    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/admin/import', { method: 'POST', body: form })
      const data: ExtractResponse = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? `HTTP ${res.status}`)
      setPhrases(data.phrases)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー')
      setStep('error')
    }
  }

  function removePhrase(index: number) {
    setPhrases((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!phrases.length) return
    setError(null)
    setStep('saving')

    try {
      const res = await fetch('/api/admin/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrases,
          source_type: sourceType,
          source_title: sourceTitle || file?.name.replace(/\.[^.]+$/, '') || '',
          source_date: sourceDate || undefined,
        }),
      })
      const data: SaveResponse = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? `HTTP ${res.status}`)
      setInsertedCount(data.inserted_count)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー')
      setStep('error')
    }
  }

  function handleReset() {
    setFile(null)
    setSourceTitle('')
    setSourceDate('')
    setSourceType('DSH_Event')
    setPhrases([])
    setError(null)
    setStep('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ヘッダー */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">フレーズ一括インポート</h1>
          <p className="text-sm text-gray-500 mt-1">
            字幕・テキストファイルから英語フレーズを自動抽出してDBに登録します
          </p>
        </div>

        {/* ステップインジケーター */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {[
            { key: 'upload', label: '① アップロード' },
            { key: 'preview', label: '② プレビュー' },
            { key: 'done', label: '③ 完了' },
          ].map(({ key, label }) => (
            <span
              key={key}
              className={`px-2 py-1 rounded ${
                step === key || (key === 'upload' && step === 'extracting') ||
                (key === 'preview' && step === 'saving')
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : step === 'done' || (key === 'upload' && ['preview','saving','done'].includes(step))
                  ? 'text-gray-400 line-through'
                  : 'text-gray-400'
              }`}
            >
              {label}
            </span>
          ))}
        </div>

        {/* ① アップロードフォーム */}
        {(step === 'upload' || step === 'extracting') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ファイルと情報を入力</CardTitle>
              <CardDescription>.txt / .vtt / .srt に対応しています</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ファイル選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ファイル <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  onChange={handleFileChange}
                  disabled={step === 'extracting'}
                  className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {file && (
                  <p className="text-xs text-gray-500 mt-1">
                    選択中: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* ソース種別 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ソース種別</label>
                <div className="flex gap-2">
                  {SOURCE_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSourceType(type)}
                      disabled={step === 'extracting'}
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
                  <span className="text-gray-400 font-normal ml-1">（省略時はファイル名）</span>
                </label>
                <input
                  type="text"
                  value={sourceTitle}
                  onChange={(e) => setSourceTitle(e.target.value)}
                  placeholder="例: Snowflake DataSuperhero Summit 2024"
                  disabled={step === 'extracting'}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 日付 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開催日<span className="text-gray-400 font-normal ml-1">（任意）</span>
                </label>
                <input
                  type="date"
                  value={sourceDate}
                  onChange={(e) => setSourceDate(e.target.value)}
                  disabled={step === 'extracting'}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 実行ボタン */}
              <button
                onClick={handleExtract}
                disabled={!file || step === 'extracting'}
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {step === 'extracting' ? 'Claude APIでフレーズ抽出中...' : 'フレーズを抽出する'}
              </button>

              {/* 進捗バー */}
              {step === 'extracting' && (
                <Progress value={null} className="h-1.5 animate-pulse" />
              )}
            </CardContent>
          </Card>
        )}

        {/* ② プレビュー */}
        {(step === 'preview' || step === 'saving') && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  抽出フレーズのプレビュー
                  <Badge variant="secondary" className="ml-2">{phrases.length}件</Badge>
                </CardTitle>
                <CardDescription>
                  不要なフレーズは削除してから登録してください
                </CardDescription>
              </CardHeader>
              <CardContent>
                {phrases.length === 0 ? (
                  <p className="text-sm text-gray-500">フレーズがありません</p>
                ) : (
                  <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                    {phrases.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 border border-gray-100 rounded-lg p-3 bg-white"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">{p.phrase}</span>
                            {p.pronunciation && (
                              <span className="text-xs text-gray-400">{p.pronunciation}</span>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              難易度 {p.difficulty}
                            </Badge>
                          </div>
                          <p className="text-sm text-blue-700 mt-0.5">{p.meaning_ja}</p>
                          {p.original_context && (
                            <p className="text-xs text-gray-400 mt-1 italic truncate">
                              &quot;{p.original_context}&quot;
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removePhrase(i)}
                          disabled={step === 'saving'}
                          className="flex-shrink-0 text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors text-lg leading-none"
                          title="削除"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <button
                onClick={handleReset}
                disabled={step === 'saving'}
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                やり直す
              </button>
              <button
                onClick={handleSave}
                disabled={phrases.length === 0 || step === 'saving'}
                className="flex-1 rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {step === 'saving' ? '登録中...' : `${phrases.length}件をDBに登録する`}
              </button>
            </div>

            {step === 'saving' && <Progress value={null} className="h-1.5 animate-pulse" />}
          </div>
        )}

        {/* ③ 完了 */}
        {step === 'done' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6 space-y-3">
              <p className="text-green-700 font-semibold">
                ✓ {insertedCount}件のフレーズを登録しました
              </p>
              <button
                onClick={handleReset}
                className="rounded-md border border-green-400 bg-white px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
              >
                続けてインポートする
              </button>
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
