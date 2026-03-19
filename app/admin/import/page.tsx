'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ExtractedPhrase, ExtractResponse, SaveResponse, SourceType } from '@/types'

type Step = 'upload' | 'extracting' | 'preview' | 'saving' | 'done' | 'error'
type ImportMode = 'file' | 'url'

const SOURCE_TYPES: SourceType[] = ['DSH_Event', 'YouTube', 'Podcast', 'Article']
const ACCEPT = '.txt,.vtt,.srt'

export default function AdminImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // インポートモード（ファイル or URL）
  const [mode, setMode] = useState<ImportMode>('file')
  const [url, setUrl] = useState('')

  const [file, setFile] = useState<File | null>(null)
  const [sourceType, setSourceType] = useState<SourceType>('DSH_Event')
  const [sourceTitle, setSourceTitle] = useState('')
  const [sourceDate, setSourceDate] = useState('')
  const [step, setStep] = useState<Step>('upload')
  const [phrases, setPhrases] = useState<ExtractedPhrase[]>([])
  const [error, setError] = useState<string | null>(null)
  const [insertedCount, setInsertedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setError(null)
  }

  async function handleExtract() {
    setError(null)
    setStep('extracting')

    try {
      let data: ExtractResponse

      if (mode === 'file') {
        if (!file) { setStep('upload'); return }
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/admin/import', { method: 'POST', body: form })
        data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error ?? `HTTP ${res.status}`)
      } else {
        if (!url.trim()) { setStep('upload'); return }
        const res = await fetch('/api/admin/import-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        })
        data = await res.json()
        if (!res.ok || !data.success) throw new Error(data.error ?? `HTTP ${res.status}`)
        // URLモードの場合、ソースタイプをArticleにデフォルト設定
        if (!sourceTitle) {
          try { setSourceTitle(new URL(url.trim()).hostname) } catch {}
        }
        if (sourceType === 'DSH_Event') setSourceType('Article')
      }

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
          source_title: sourceTitle || (mode === 'file' ? file?.name.replace(/\.[^.]+$/, '') : url) || '',
          source_date: sourceDate || undefined,
        }),
      })
      const data: SaveResponse = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? `HTTP ${res.status}`)
      setInsertedCount(data.inserted_count)
      setSkippedCount(data.skipped_count ?? 0)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラー')
      setStep('error')
    }
  }

  function handleReset() {
    setFile(null); setUrl('')
    setSourceTitle(''); setSourceDate('')
    setSourceType('DSH_Event')
    setPhrases([]); setError(null)
    setStep('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const extractedPhrases = phrases.filter((p) => !p.suggested)
  const suggestedPhrases = phrases.filter((p) => p.suggested)
  const isExtracting = step === 'extracting'
  const canExtract = mode === 'file' ? !!file : !!url.trim()

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ヘッダー：戻るボタン付き */}
        <div className="flex items-start gap-3">
          <Link
            href="/"
            className="mt-0.5 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← ホーム
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">フレーズ一括インポート</h1>
            <p className="text-sm text-gray-500 mt-1">
              字幕・テキストファイルまたはURLから英語フレーズを自動抽出してDBに登録します
            </p>
          </div>
        </div>

        {/* ステップインジケーター */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {[
            { key: 'upload', label: '① 取り込み' },
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
              <CardTitle className="text-base">取り込み元と情報を入力</CardTitle>
              <CardDescription>ファイルアップロードまたはURLを選択してください</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* モード切り替えタブ */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                {(['file', 'url'] as ImportMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    disabled={isExtracting}
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
                    disabled={isExtracting}
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
                    disabled={isExtracting}
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
                      disabled={isExtracting}
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
                  disabled={isExtracting}
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
                  disabled={isExtracting}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 実行ボタン */}
              <button
                onClick={handleExtract}
                disabled={!canExtract || isExtracting}
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isExtracting ? 'Claude APIでフレーズ抽出中...' : 'フレーズを抽出する'}
              </button>

              {isExtracting && <Progress value={null} className="h-1.5 animate-pulse" />}
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
                  {suggestedPhrases.length > 0 && (
                    <Badge className="ml-1.5 bg-violet-100 text-violet-700 border-0">
                      うち提案 {suggestedPhrases.length}件
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>不要なフレーズは削除してから登録してください</CardDescription>
              </CardHeader>
              <CardContent>
                {/* 難易度別件数 */}
                {phrases.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {[1,2,3,4,5].map((lv) => {
                      const count = phrases.filter((p) => p.difficulty === lv).length
                      if (count === 0) return null
                      const cls = ['','bg-emerald-100 text-emerald-700','bg-sky-100 text-sky-700','bg-amber-100 text-amber-700','bg-orange-100 text-orange-700','bg-red-100 text-red-700'][lv]
                      return (
                        <span key={lv} className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
                          Lv.{lv}: {count}件
                        </span>
                      )
                    })}
                  </div>
                )}

                {phrases.length === 0 ? (
                  <p className="text-sm text-gray-500">フレーズがありません</p>
                ) : (
                  <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                    {/* テキスト抽出フレーズ */}
                    {extractedPhrases.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          テキストから抽出 ({extractedPhrases.length}件)
                        </p>
                        {extractedPhrases.map((p, i) => (
                          <PhraseRow
                            key={`extracted-${i}`}
                            phrase={p}
                            onRemove={() => removePhrase(phrases.indexOf(p))}
                            disabled={step === 'saving'}
                          />
                        ))}
                      </div>
                    )}

                    {/* 関連慣用句の提案 */}
                    {suggestedPhrases.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-violet-600 uppercase tracking-wider flex items-center gap-1">
                          ✨ AIが関連慣用句を提案 ({suggestedPhrases.length}件)
                          <span className="text-gray-400 font-normal normal-case">— 不要なものは削除してください</span>
                        </p>
                        {suggestedPhrases.map((p, i) => (
                          <PhraseRow
                            key={`suggested-${i}`}
                            phrase={p}
                            suggested
                            onRemove={() => removePhrase(phrases.indexOf(p))}
                            disabled={step === 'saving'}
                          />
                        ))}
                      </div>
                    )}
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
              {skippedCount > 0 && (
                <p className="text-sm text-gray-500">{skippedCount}件は既存のため重複スキップ</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="rounded-md border border-green-400 bg-white px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
                >
                  続けてインポートする
                </button>
                <Link
                  href="/"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  ← ホームに戻る
                </Link>
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

/** フレーズ1件の表示コンポーネント */
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
    <div className={`flex items-start gap-3 border rounded-lg p-3 bg-white ${suggested ? 'border-violet-200' : 'border-gray-100'}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">{p.phrase}</span>
          {p.pronunciation && (
            <span className="text-xs text-gray-400">{p.pronunciation}</span>
          )}
          <Badge variant="secondary" className="text-xs">難易度 {p.difficulty}</Badge>
          {suggested && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-medium">
              提案
            </span>
          )}
        </div>
        <p className="text-sm text-blue-700 mt-0.5">{p.meaning_ja}</p>
        {p.original_context && (
          <p className="text-xs text-gray-400 mt-1 italic truncate">
            &quot;{p.original_context}&quot;
          </p>
        )}
      </div>
      <button
        onClick={onRemove}
        disabled={disabled}
        className="flex-shrink-0 text-gray-300 hover:text-red-400 disabled:opacity-30 transition-colors text-lg leading-none"
        title="削除"
      >
        ×
      </button>
    </div>
  )
}
