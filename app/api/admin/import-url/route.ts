import { NextRequest, NextResponse } from 'next/server'
import { extractPhrasesWithClaude } from '@/lib/extract-phrases'
import { log } from '@/lib/logger'
import { ExtractResponse } from '@/types'

const TEXT_MAX_LEN = 200_000

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

/** HTMLからプレーンテキストを抽出（サーバーサイド用・DOMなし） */
function htmlToText(html: string): string {
  return html
    // scriptタグ・styleタグごと除去
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    // SVGやコメントも除去
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    // HTMLタグ除去
    .replace(/<[^>]+>/g, ' ')
    // HTMLエンティティをデコード
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    // 余分な空白を正規化
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function POST(req: NextRequest) {
  let body: { url?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json<ExtractResponse>(
      { success: false, phrases: [], error: 'リクエストの解析に失敗しました' },
      { status: 400 }
    )
  }

  const rawUrl = (body.url ?? '').trim()
  if (!rawUrl) {
    return NextResponse.json<ExtractResponse>(
      { success: false, phrases: [], error: 'URLを入力してください' },
      { status: 400 }
    )
  }

  // URLパース・バリデーション
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return NextResponse.json<ExtractResponse>(
      { success: false, phrases: [], error: '有効なURLではありません' },
      { status: 400 }
    )
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json<ExtractResponse>(
      { success: false, phrases: [], error: 'http または https のURLのみ対応しています' },
      { status: 400 }
    )
  }

  if (!isAllowedHost(parsed.hostname)) {
    return NextResponse.json<ExtractResponse>(
      { success: false, phrases: [], error: 'このURLへのアクセスは許可されていません' },
      { status: 403 }
    )
  }

  try {
    // URL からコンテンツを取得（タイムアウト15秒）
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

    if (!res.ok) {
      return NextResponse.json<ExtractResponse>(
        { success: false, phrases: [], error: `URLの取得に失敗しました (HTTP ${res.status})` },
        { status: 422 }
      )
    }

    const contentType = res.headers.get('content-type') ?? ''
    // レスポンスが大きすぎる場合はここで弾く（3MB上限）
    const contentLength = Number(res.headers.get('content-length') ?? '0')
    if (contentLength > 3 * 1024 * 1024) {
      return NextResponse.json<ExtractResponse>(
        { success: false, phrases: [], error: 'ページサイズが大きすぎます（上限3MB）' },
        { status: 413 }
      )
    }

    const rawContent = await res.text()

    // HTMLの場合はタグを除去してプレーンテキストに変換
    const isHtml = contentType.includes('html') || rawContent.trimStart().startsWith('<')
    const plainText = isHtml ? htmlToText(rawContent) : rawContent

    const text = plainText.length > TEXT_MAX_LEN
      ? plainText.slice(0, TEXT_MAX_LEN)
      : plainText

    if (!text.trim() || text.trim().length < 100) {
      return NextResponse.json<ExtractResponse>(
        { success: false, phrases: [], error: 'URLからテキストを十分に取得できませんでした。別のURLをお試しください。' },
        { status: 422 }
      )
    }

    const phrases = await extractPhrasesWithClaude(text)

    log({ level: 'info', endpoint: '/api/admin/import-url',
      message: 'url_import_success', detail: { url: parsed.hostname, phrase_count: phrases.length } })

    return NextResponse.json<ExtractResponse>({ success: true, phrases })
  } catch (err) {
    const message = err instanceof Error
      ? (err.name === 'AbortError' ? 'URLの取得がタイムアウトしました（15秒）' : err.message)
      : '不明なエラーが発生しました'
    log({ level: 'error', endpoint: '/api/admin/import-url', message, detail: { url: rawUrl } })
    return NextResponse.json<ExtractResponse>(
      { success: false, phrases: [], error: message },
      { status: 500 }
    )
  }
}
