import { NextRequest, NextResponse } from 'next/server'
import { parseTranscript } from '@/lib/parse-transcript'
import { extractPhrasesWithClaude } from '@/lib/extract-phrases'
import { ExtractResponse } from '@/types'

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json<ExtractResponse>(
      { success: false, phrases: [], error: 'FormDataの解析に失敗しました' },
      { status: 400 }
    )
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json<ExtractResponse>(
      { success: false, phrases: [], error: 'ファイルが見つかりません' },
      { status: 400 }
    )
  }

  // ファイルサイズ制限: 2MB
  const MAX_FILE_SIZE = 2 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json<ExtractResponse>(
      { success: false, phrases: [], error: `ファイルサイズが上限（2MB）を超えています（${(file.size / 1024 / 1024).toFixed(1)}MB）` },
      { status: 413 }
    )
  }

  const allowedExts = ['txt', 'vtt', 'srt']
  // ファイル名から拡張子のみ取得（パストラバーサル対策として basename を使用）
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const ext = safeName.split('.').pop()?.toLowerCase() ?? ''
  if (!allowedExts.includes(ext)) {
    return NextResponse.json<ExtractResponse>(
      { success: false, phrases: [], error: '.txt / .vtt / .srt のみ対応しています' },
      { status: 400 }
    )
  }

  try {
    const rawText = await file.text()
    // テキスト長制限: 200,000文字（Claudeトークン上限の目安）
    const TEXT_MAX_LEN = 200_000
    const truncatedText = rawText.length > TEXT_MAX_LEN ? rawText.slice(0, TEXT_MAX_LEN) : rawText
    const text = parseTranscript(safeName, truncatedText)

    if (!text.trim()) {
      return NextResponse.json<ExtractResponse>(
        { success: false, phrases: [], error: 'ファイルからテキストを抽出できませんでした' },
        { status: 422 }
      )
    }

    const phrases = await extractPhrasesWithClaude(text)

    return NextResponse.json<ExtractResponse>({ success: true, phrases })
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラーが発生しました'
    console.error('[admin/import]', message)
    return NextResponse.json<ExtractResponse>(
      { success: false, phrases: [], error: message },
      { status: 500 }
    )
  }
}
