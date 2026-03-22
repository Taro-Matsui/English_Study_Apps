import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import { parseTranscript } from '@/lib/parse-transcript'
import { extractPhrasesWithClaude } from '@/lib/extract-phrases'
import { log } from '@/lib/logger'
import { ExtractedPhrase } from '@/types'

const TEXT_MAX_LEN = 200_000
const ALLOWED_EXTS = ['txt', 'vtt', 'srt']

/** SSRF対策: プライベートIP・ループバックアドレスを拒否 */
function isAllowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  const blocked = [
    'localhost', '0.0.0.0',
    '127.', '10.', '192.168.', '169.254.',
    '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.',
    '172.24.', '172.25.', '172.26.', '172.27.',
    '172.28.', '172.29.', '172.30.', '172.31.',
    '::1', '[::1]', '[::ffff:',
  ]
  return !blocked.some((b) => h === b || h.startsWith(b))
}

function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** ジョブのuser_idからユーザーの学習設定を取得する */
async function getUserContext(db: ReturnType<typeof getSupabaseAdmin>, jobId: string) {
  try {
    const { data: job } = await db.from('import_jobs').select('user_id').eq('id', jobId).single()
    if (!job?.user_id) return undefined
    const { data: { user } } = await db.auth.admin.getUserById(job.user_id)
    if (!user) return undefined
    return {
      study_purpose:     user.user_metadata?.study_purpose     as string | undefined,
      study_subcategory: user.user_metadata?.study_subcategory as string | undefined,
      study_level:       user.user_metadata?.study_level       as string | undefined,
    }
  } catch {
    return undefined
  }
}

/** バックグラウンドでClaudeを呼び、ジョブを更新する */
async function processJob(jobId: string, text: string) {
  const db = getSupabaseAdmin()
  try {
    const userContext = await getUserContext(db, jobId)
    const phrases: ExtractedPhrase[] = await extractPhrasesWithClaude(text, userContext)
    await db.from('import_jobs').update({
      status: 'done',
      phrase_count: phrases.length,
      phrases: phrases as unknown as Record<string, unknown>[],
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)
    log({ level: 'info', endpoint: '/api/admin/import-async',
      message: 'job_done', detail: { job_id: jobId, phrase_count: phrases.length } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown_error'
    await db.from('import_jobs').update({
      status: 'error',
      error_text: msg,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)
    log({ level: 'error', endpoint: '/api/admin/import-async',
      message: 'job_failed', detail: { job_id: jobId, error: msg } })
  }
}

/** バックグラウンドでURLを取得してClaudeを呼ぶ */
async function processJobFromUrl(jobId: string, rawUrl: string) {
  const db = getSupabaseAdmin()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15_000)
    let res: Response
    try {
      res = await fetch(rawUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': 'EngineerEnglishBot/1.0' },
      })
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) throw new Error(`URLの取得に失敗しました (HTTP ${res.status})`)
    const raw = await res.text()
    const contentType = res.headers.get('content-type') ?? ''
    const isHtml = contentType.includes('html') || raw.trimStart().startsWith('<')
    const plain = isHtml ? htmlToText(raw) : raw
    const text = plain.length > TEXT_MAX_LEN ? plain.slice(0, TEXT_MAX_LEN) : plain
    if (text.trim().length < 100) throw new Error('URLからテキストを十分に取得できませんでした')
    await processJob(jobId, text)
  } catch (err) {
    const msg = err instanceof Error
      ? (err.name === 'AbortError' ? 'URLの取得がタイムアウトしました（15秒）' : err.message)
      : 'unknown_error'
    await db.from('import_jobs').update({
      status: 'error',
      error_text: msg,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)
    log({ level: 'error', endpoint: '/api/admin/import-async',
      message: 'url_job_failed', detail: { job_id: jobId, error: msg } })
  }
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ success: false, error: 'ログインが必要です' }, { status: 401 })

  const db = getSupabaseAdmin()

  // 並行実行制御: 同一ユーザーの processing ジョブが存在する場合は拒否
  const { data: running } = await db
    .from('import_jobs')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'processing')
    .limit(1)
  if (running?.length) {
    return NextResponse.json(
      { success: false, error: '処理中のジョブがあります。完了後に再度お試しください' },
      { status: 429 }
    )
  }

  const contentType = req.headers.get('content-type') ?? ''

  // ── ファイルモード ──
  if (contentType.includes('multipart/form-data')) {
    let formData: FormData
    try { formData = await req.formData() }
    catch { return NextResponse.json({ success: false, error: 'FormDataの解析に失敗しました' }, { status: 400 }) }

    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ success: false, error: 'ファイルが見つかりません' }, { status: 400 })
    if (file.size > 2 * 1024 * 1024)
      return NextResponse.json({ success: false, error: 'ファイルサイズが上限（2MB）を超えています' }, { status: 413 })

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const ext = safeName.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTS.includes(ext))
      return NextResponse.json({ success: false, error: '.txt / .vtt / .srt のみ対応しています' }, { status: 400 })

    const rawText = await file.text()
    const truncated = rawText.length > TEXT_MAX_LEN ? rawText.slice(0, TEXT_MAX_LEN) : rawText
    const text = parseTranscript(safeName, truncated)
    if (!text.trim())
      return NextResponse.json({ success: false, error: 'ファイルからテキストを抽出できませんでした' }, { status: 422 })

    // ジョブ作成
    const { data: job, error: jobErr } = await db
      .from('import_jobs')
      .insert({ type: 'file', source_name: file.name, status: 'processing', user_id: user.id })
      .select('id').single()
    if (jobErr || !job)
      return NextResponse.json({ success: false, error: 'ジョブの作成に失敗しました' }, { status: 500 })

    // バックグラウンドでClaude処理（fire-and-forget）
    processJob(job.id as string, text).catch(console.error)

    return NextResponse.json({ success: true, job_id: job.id })
  }

  // ── テキスト貼り付け / URLモード ──
  if (contentType.includes('application/json')) {
    let body: { url?: string; text?: string; sourceType?: string; sourceTitle?: string; sourceDate?: string }
    try { body = await req.json() }
    catch { return NextResponse.json({ success: false, error: 'リクエストの解析に失敗しました' }, { status: 400 }) }

    // テキスト貼り付けモード
    if (body.text !== undefined) {
      const text = String(body.text).slice(0, TEXT_MAX_LEN)
      if (text.trim().length < 100)
        return NextResponse.json({ success: false, error: 'テキストが短すぎます（100文字以上入力してください）' }, { status: 400 })

      const sourceName = String(body.sourceTitle || 'テキスト貼り付け').slice(0, 200)
      const { data: job, error: jobErr } = await db
        .from('import_jobs')
        .insert({ type: 'file', source_name: sourceName, status: 'processing', user_id: user.id })
        .select('id').single()
      if (jobErr || !job)
        return NextResponse.json({ success: false, error: 'ジョブの作成に失敗しました' }, { status: 500 })

      processJob(job.id as string, text).catch(console.error)
      return NextResponse.json({ success: true, job_id: job.id })
    }

    const rawUrl = (body.url ?? '').trim()
    if (!rawUrl)
      return NextResponse.json({ success: false, error: 'URLを入力してください' }, { status: 400 })

    let parsed: URL
    try { parsed = new URL(rawUrl) }
    catch { return NextResponse.json({ success: false, error: '有効なURLではありません' }, { status: 400 }) }

    if (!['http:', 'https:'].includes(parsed.protocol))
      return NextResponse.json({ success: false, error: 'http または https のURLのみ対応しています' }, { status: 400 })

    if (!isAllowedHost(parsed.hostname))
      return NextResponse.json({ success: false, error: 'このURLへのアクセスは許可されていません' }, { status: 403 })

    // ジョブ作成
    const { data: job, error: jobErr } = await db
      .from('import_jobs')
      .insert({ type: 'url', source_name: parsed.hostname, status: 'processing', user_id: user.id })
      .select('id').single()
    if (jobErr || !job)
      return NextResponse.json({ success: false, error: 'ジョブの作成に失敗しました' }, { status: 500 })

    // バックグラウンドでURL取得+Claude処理
    processJobFromUrl(job.id as string, rawUrl).catch(console.error)

    return NextResponse.json({ success: true, job_id: job.id })
  }

  return NextResponse.json({ success: false, error: 'Content-Type が不正です' }, { status: 400 })
}
