import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { SaveRequest, SaveResponse } from '@/types'

export async function POST(req: NextRequest) {
  let body: SaveRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json<SaveResponse>(
      { success: false, inserted_count: 0, error: 'リクエストボディが不正です' },
      { status: 400 }
    )
  }

  const { phrases, source_type, source_title, source_date } = body

  if (!phrases?.length) {
    return NextResponse.json<SaveResponse>(
      { success: false, inserted_count: 0, error: '登録するフレーズがありません' },
      { status: 400 }
    )
  }

  try {
    const rows = phrases.map((p) => ({
      phrase: p.phrase,
      pronunciation: p.pronunciation || null,
      meaning_ja: p.meaning_ja || null,
      source_type: source_type || null,
      source_title: source_title || null,
      source_date: source_date || null,
      original_context: p.original_context || null,
      difficulty: p.difficulty ?? 3,
    }))

    const { data, error } = await supabaseAdmin
      .from('phrases')
      .insert(rows)
      .select()

    if (error) throw new Error(`Supabase挿入エラー: ${error.message}`)

    return NextResponse.json<SaveResponse>({
      success: true,
      inserted_count: data?.length ?? 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー'
    console.error('[admin/save]', message)
    return NextResponse.json<SaveResponse>(
      { success: false, inserted_count: 0, error: message },
      { status: 500 }
    )
  }
}
