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

  const allowedExts = ['txt', 'vtt', 'srt']
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!allowedExts.includes(ext)) {
    return NextResponse.json<ExtractResponse>(
      { success: false, phrases: [], error: '.txt / .vtt / .srt のみ対応しています' },
      { status: 400 }
    )
  }

  try {
    const rawText = await file.text()
    const text = parseTranscript(file.name, rawText)

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
