import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { SaveRequest, SaveResponse } from '@/types'

export async function POST(req: NextRequest) {
  let body: SaveRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json<SaveResponse>(
      { success: false, inserted_count: 0, skipped_count: 0, error: 'リクエストボディが不正です' },
      { status: 400 }
    )
  }

  const { phrases, source_type, source_title, source_date } = body
  if (!phrases?.length) {
    return NextResponse.json<SaveResponse>(
      { success: false, inserted_count: 0, skipped_count: 0, error: '登録するフレーズがありません' },
      { status: 400 }
    )
  }

  try {
    const db = getSupabaseAdmin()
    const phraseTexts = phrases.map((p) => p.phrase.toLowerCase())

    // 既存フレーズを取得して重複チェック
    const { data: existing } = await db
      .from('phrases')
      .select('phrase')
      .in('phrase', phrases.map((p) => p.phrase))

    const existingSet = new Set(
      (existing ?? []).map((e: { phrase: string }) => e.phrase.toLowerCase())
    )

    const newRows = phrases
      .filter((p) => !existingSet.has(p.phrase.toLowerCase()))
      .map((p) => ({
        phrase: p.phrase,
        pronunciation: p.pronunciation || null,
        meaning_ja: p.meaning_ja || null,
        source_type: source_type || null,
        source_title: source_title || null,
        source_date: source_date || null,
        original_context: p.original_context || null,
        difficulty: p.difficulty ?? 3,
      }))

    const skipped = phraseTexts.length - newRows.length

    if (newRows.length === 0) {
      return NextResponse.json<SaveResponse>({
        success: true,
        inserted_count: 0,
        skipped_count: skipped,
      })
    }

    const { data, error } = await db.from('phrases').insert(newRows).select()
    if (error) throw new Error(`Supabase挿入エラー: ${error.message}`)

    return NextResponse.json<SaveResponse>({
      success: true,
      inserted_count: data?.length ?? 0,
      skipped_count: skipped,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー'
    console.error('[admin/save]', message)
    return NextResponse.json<SaveResponse>(
      { success: false, inserted_count: 0, skipped_count: 0, error: message },
      { status: 500 }
    )
  }
}
