'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { AdBanner } from '@/components/AdBanner'

type Step = 'upload' | 'submitting' | 'submitted' | 'error'
type ImportMode = 'file' | 'text'

const TEXT_MAX = 200_000
const HASH_STORAGE_KEY = 'import_hashes'

const SAMPLE_TEXT = `Good morning, everyone. Let's kick off today's sprint planning.
First, I'd like to touch base on the deployment pipeline issues we had last week.
The root cause was a race condition in our CI workflow.
Going forward, we should time-box our reviews to keep things moving.
Any blockers before we dive into the backlog?
Let's make sure we're on the same page about the acceptance criteria.
I'll circle back after standup to sync on the API contract.`

const ACCEPT = '.txt,.vtt,.srt'

// 「貼る → AIが選ぶ → 定着」— 登録すると何が得られるかの期待値を伝える3ステップ
const STEPS: { icon: string; label: string }[] = [
  { icon: '📥', label: '英語を貼る' },
  { icon: '✨', label: 'AIが必要なフレーズを選ぶ' },
  { icon: '🎯', label: 'チャレンジで定着' },
]

// 「英語ならなんでも学べる」利用の幅を示すチップ。選択は強制せず、押すと例文プレースホルダが変わるだけ。
const DEFAULT_PLACEHOLDER =
  '会議のチャット・記事の一節・YouTubeの字幕・Podcastの書き起こし…英語ならなんでもOK。ここに貼り付け（100文字〜）'
const SOURCE_EXAMPLES: { key: string; icon: string; label: string; placeholder: string }[] = [
  { key: 'meeting', icon: '💬', label: '会議・チャット', placeholder: 'Slack・Teams・会議の英語ログをそのまま貼り付け…（100文字〜）' },
  { key: 'article', icon: '📰', label: '記事・ブログ',   placeholder: '英語記事・ブログの本文をコピーして貼り付け…（100文字〜）' },
  { key: 'youtube', icon: '▶️', label: 'YouTube字幕',   placeholder: 'YouTube字幕のテキストを貼り付け（.vtt/.srtファイルは下のリンクから）…' },
  { key: 'podcast', icon: '🎙️', label: 'Podcast',      placeholder: 'Whisper・Otter.ai などの文字起こしを貼り付け…（100文字〜）' },
  { key: 'other',   icon: '📋', label: 'その他',         placeholder: '英語のテキストなら何でも貼り付け…（100文字〜）' },
]

// 成果プレビュー: サンプル文(sprint planning)から実際に採れる代表フレーズ
const SAMPLE_PHRASES = ['circle back', 'touch base', 'on the same page', 'time-box']

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
function titleFromText(text: string) { return text.trim().split('\n')[0].slice(0, 30).trim() }

export default function LibraryImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<ImportMode>('text')
  const [placeholder, setPlaceholder] = useState(DEFAULT_PLACEHOLDER)
  const [expanded, setExpanded] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [sourceTitle, setSourceTitle] = useState('')
  const [step, setStep] = useState<Step>('upload')
  const [error, setError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [dupConfirm, setDupConfirm] = useState(false)
  const pendingHashRef = useRef<string | null>(null)
  const [consented, setConsented] = useState(false)

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

  // 字幕(.vtt/.srt)混入の検知: text経路は parseTranscript を通さないため、タイムスタンプ行が残ると抽出精度が落ちる
  const looksLikeSubtitle = mode === 'text' && /-->/.test(pasteText)

  // 入力方法の切替（file/paste の実機能差だけを残す）。入力内容は破棄しない＝「貼ったのに消えた」事故を防ぐ
  function switchToFile() {
    setMode('file')
    setError(null)
  }
  function switchToText() {
    setMode('text')
    setError(null)
  }

  const isSubmitting = step === 'submitting'
  const canSubmit =
    consented && (mode === 'file' ? !!file : pasteText.trim().length >= 100)

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
          body: JSON.stringify({ text: trimmed, sourceTitle: sourceTitle || 'テキスト貼り付け' }),
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
    setFile(null); setPasteText('')
    setSourceTitle(''); setError(null); setJobId(null); setDupConfirm(false)
    setConsented(false)
    setMode('text'); setPlaceholder(DEFAULT_PLACEHOLDER)
    setStep('upload')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-ground pb-24">

      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-ground/95 backdrop-blur-sm border-b border-line">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center gap-2">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-3xl p-3 -ml-3 flex items-center justify-center">‹</Link>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800">出会いから英語をピックする</p>
            <p className="text-[11px] text-gray-400 leading-tight">会話録・記事・字幕を追加してAIがPickします</p>
          </div>
          <Link href="/library/jobs" className="text-xs text-brand hover:text-brand-deep border border-line rounded-lg px-3 py-1.5 flex-shrink-0 transition-colors whitespace-nowrap">
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
              ? 'bg-ground border-line'
              : 'bg-white border-line'
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
                  quotaInfo.used >= quotaInfo.limit ? 'bg-red-500' : 'bg-brand'
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
                  className="flex-1 rounded-xl bg-brand text-white text-sm font-medium py-2.5 hover:bg-brand-deep transition-colors">
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
            {/* 期待値の3ステップ：貼る → AIが選ぶ → 定着（登録の価値を先に伝える） */}
            <div className="flex items-center justify-between gap-1 px-1 pt-1">
              {STEPS.map((s, i) => (
                <div key={s.label} className="flex items-center gap-1 min-w-0">
                  <span className="text-sm flex-shrink-0">{s.icon}</span>
                  <span className="text-[10px] leading-tight text-gray-500 truncate">{s.label}</span>
                  {i < STEPS.length - 1 && <span className="text-gray-300 text-xs flex-shrink-0 ml-1">→</span>}
                </div>
              ))}
            </div>

            {/* コンテンツ入力エリア */}
            <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">

              {/* 入力方法の選択（貼り付け / ファイル）。切替で入力内容は破棄しない */}
              <div className="p-3 pb-0">
                <div className="grid grid-cols-2 gap-1 bg-gray-100 rounded-xl p-1">
                  <button type="button" onClick={switchToText} disabled={isSubmitting}
                    className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                      mode === 'text' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    ✍️ 貼り付け
                  </button>
                  <button type="button" onClick={switchToFile} disabled={isSubmitting}
                    className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                      mode === 'file' ? 'bg-white text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}>
                    📎 ファイル
                  </button>
                </div>
              </div>

              {/* テキスト貼り付け（主役） */}
              {mode === 'text' && (
                <div className="p-5 space-y-2">
                  <textarea
                    value={pasteText}
                    onChange={(e) => {
                      const t = e.target.value.slice(0, TEXT_MAX)
                      setPasteText(t)
                      if (t.length > 10) setSourceTitle(titleFromText(t))
                    }}
                    placeholder={placeholder}
                    disabled={isSubmitting}
                    rows={7}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-none"
                    style={{ fontSize: '16px' }}
                    autoFocus
                  />

                  {/* 字幕混入ガード：text経路は parseTranscript を通さないため、ファイル読込へ誘導 */}
                  {looksLikeSubtitle && (
                    <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                      <span className="flex-shrink-0">⚠️</span>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        字幕ファイルのようです。タイムスタンプが混ざると精度が落ちます。
                        <button type="button" onClick={switchToFile} className="font-semibold underline ml-1">
                          ファイルとして読み込む
                        </button>
                        のが正確です。
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {pasteText.trim().length < 100 && pasteText.length > 0
                        ? <span className="text-amber-500">あと {100 - pasteText.trim().length} 文字以上</span>
                        : `${pasteText.length.toLocaleString()} 文字`}
                    </p>
                    <button type="button" onClick={() => {
                      setPasteText(SAMPLE_TEXT)
                      setSourceTitle('サンプル会議録')
                    }} disabled={isSubmitting}
                      className="text-xs text-brand hover:text-brand-deep transition-colors">
                      💡 サンプルを試す
                    </button>
                  </div>

                  {/* 成果プレビュー：こんなフレーズが見つかる（価値を具体化） */}
                  <div className="rounded-lg bg-ground px-3 py-2">
                    <p className="text-[11px] leading-relaxed">
                      <span className="text-gray-400">こんなフレーズが見つかります：</span>{' '}
                      {SAMPLE_PHRASES.map((p, i) => (
                        <span key={p}>
                          <span className="font-semibold text-brand">{p}</span>
                          {i < SAMPLE_PHRASES.length - 1 && <span className="text-gray-300"> ・ </span>}
                        </span>
                      ))}
                    </p>
                  </div>

                  {/* 幅chips：英語ならなんでもOK（選択は強制せず、押すと例文が変わるだけ） */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {SOURCE_EXAMPLES.map((s) => (
                      <button key={s.key} type="button" disabled={isSubmitting}
                        onClick={() => setPlaceholder(s.placeholder)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">
                        <span>{s.icon}</span><span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ファイル（字幕・書き起こし専用） */}
              {mode === 'file' && (
                <div className="p-5 space-y-3">
                  <label className="block">
                    <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      file ? 'border-brand bg-ground' : 'border-gray-200 hover:border-brand'
                    }`}>
                      {file ? (
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-800">{file.name}</p>
                          <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                          <p className="text-xs text-brand">別のファイルを選ぶ場合はタップ</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-2xl">📎</p>
                          <p className="text-sm font-medium text-gray-600">字幕・書き起こしファイルを選択</p>
                          <p className="text-xs text-gray-400">.txt / .vtt / .srt（タイムスタンプは自動で除去）</p>
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
                </div>
              )}

              {/* ヒント（常設・1箇所） */}
              <div className="px-5 pb-4 pt-2">
                <p className="text-xs text-gray-600 bg-ground rounded-lg px-3 py-2 leading-relaxed flex items-start gap-1.5">
                  <span className="flex-shrink-0">💡</span>
                  <span>字幕（.vtt / .srt）や音声は、ご自身で書き起こし・ダウンロードしてから追加してください。</span>
                </p>
              </div>

              {/* 詳細（任意）— タイトルのみ（種別は保存時に選択） */}
              <div className="border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <span>詳細（任意）— タイトル</span>
                  <span className={`text-lg leading-none transition-transform ${expanded ? 'rotate-90' : ''}`}>›</span>
                </button>
                {expanded && (
                  <div className="px-5 pb-4 space-y-4">
                    {/* タイトル */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">タイトル</p>
                      <input
                        type="text"
                        value={sourceTitle}
                        onChange={(e) => setSourceTitle(e.target.value)}
                        placeholder="（自動入力）"
                        disabled={isSubmitting}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 登録時の同意チェック */}
            <div className={`rounded-xl border px-4 py-3 space-y-2.5 transition-colors ${
              consented ? 'bg-white border-line' : 'bg-amber-50 border-amber-200'
            }`}>
              <ul className="pl-1 space-y-1.5 text-[11px] text-gray-600 list-none leading-relaxed">
                <li>・字幕DLや音声文字起こしは<span className="font-semibold text-gray-800">ご自身で行ってから</span>貼り付け・読み込みをしてください。</li>
                <li>・入力テキストはフレーズ抽出のため<span className="font-semibold text-gray-800"> AI（Anthropic／米国）に送信</span>されます。</li>
                <li>・取り込んだ全文は保存されません。保存するのは抽出フレーズと短い用例のみです。</li>
                <li>・会社の機密・NDA 対象の資料や第三者の個人情報は登録しないでください。</li>
              </ul>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded border-gray-300 text-brand accent-brand flex-shrink-0"
                />
                <span className={`text-xs font-semibold ${consented ? 'text-gray-700' : 'text-amber-800'}`}>
                  上記を確認し、自分の責任で利用します
                </span>
              </label>
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
              className="w-full rounded-2xl bg-brand px-4 py-4 text-sm font-bold text-white hover:bg-brand-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md shadow-brand/20"
            >
              {isSubmitting ? '処理を開始しています...' : (mode === 'file' ? 'このファイルからフレーズをPick →' : 'このテキストからフレーズをPick →')}
            </button>

            {isSubmitting && <Progress value={null} className="h-1 animate-pulse" />}
          </>
        )}

        {/* 送信完了 */}
        {step === 'submitted' && jobId && (
          <div className="bg-white rounded-2xl border border-line shadow-sm p-6 space-y-4">
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
                className="rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white hover:bg-brand-deep transition-colors text-center">
                ソースを確認する →
              </Link>
              <div className="flex gap-2">
                <Link href={`/library/jobs/${jobId}`}
                  className="flex-1 rounded-xl border border-line bg-ground px-4 py-2.5 text-sm font-medium text-brand hover:bg-brand-soft transition-colors text-center">
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
