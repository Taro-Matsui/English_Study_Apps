import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import { log } from '@/lib/logger'
import { SaveRequest, SaveResponse, SourceType, UsageScene, EngineerLevel } from '@/types'

// H4: 許可値をallowlistで定義し、DB書き込み前にバリデーションする
const ALLOWED_SOURCE_TYPES: SourceType[] = ['YouTube', 'Podcast', '議事録', '英語記事', 'その他']
const ALLOWED_USAGE_SCENES: UsageScene[] = ['daily', 'technical', 'business', 'other']
const ALLOWED_ENGINEER_LEVELS: EngineerLevel[] = ['junior', 'mid', 'senior']

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json<SaveResponse>(
    { success: false, inserted_count: 0, updated_count: 0, skipped_count: 0, error: 'ログインが必要です' },
    { status: 401 }
  )

  let body: SaveRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json<SaveResponse>(
      { success: false, inserted_count: 0, updated_count: 0, skipped_count: 0, error: 'リクエストボディが不正です' },
      { status: 400 }
    )
  }

  const { phrases, source_type, source_title, source_date } = body

  // H4: source_type の allowlist バリデーション
  if (source_type && !(ALLOWED_SOURCE_TYPES as string[]).includes(source_type)) {
    return NextResponse.json<SaveResponse>(
      { success: false, inserted_count: 0, updated_count: 0, skipped_count: 0, error: 'source_type が不正です' },
      { status: 400 }
    )
  }

  // フレーズ件数上限（DoS対策）
  if (!phrases?.length) {
    return NextResponse.json<SaveResponse>(
      { success: false, inserted_count: 0, updated_count: 0, skipped_count: 0, error: '登録するフレーズがありません' },
      { status: 400 }
    )
  }
  if (phrases.length > 200) {
    return NextResponse.json<SaveResponse>(
      { success: false, inserted_count: 0, updated_count: 0, skipped_count: 0, error: '一度に登録できるフレーズは200件までです' },
      { status: 400 }
    )
  }

  try {
    const db = getSupabaseAdmin()

    // 既存フレーズを取得して新規/更新に分類（自分のフレーズのみ・大文字小文字を区別しない）
    const { data: existing } = await db
      .from('phrases')
      .select('id, phrase')
      .eq('user_id', user.id)
      .in('phrase', phrases.map((p) => p.phrase))

    const existingMap = new Map(
      (existing ?? []).map((e: { id: string; phrase: string }) => [e.phrase.toLowerCase(), e.id])
    )

    const toInsert: typeof phrases = []
    const toUpdate: typeof phrases = []

    for (const p of phrases) {
      if (existingMap.has(p.phrase.toLowerCase())) {
        toUpdate.push(p)
      } else {
        toInsert.push(p)
      }
    }

    const buildRow = (p: typeof phrases[0]) => ({
      user_id: user.id,
      phrase: p.phrase,
      pronunciation: p.pronunciation || null,
      meaning_ja: p.meaning_ja || null,
      source_type: source_type || null,
      source_title: source_title || null,
      source_date: source_date || null,
      original_context: p.original_context || null,
      difficulty: p.difficulty ?? 3,
      // H4: 許可値以外はデフォルト値にフォールバック
      usage_scene: ALLOWED_USAGE_SCENES.includes(p.usage_scene) ? p.usage_scene : 'other',
      engineer_level: ALLOWED_ENGINEER_LEVELS.includes(p.engineer_level) ? p.engineer_level : 'mid',
    })

    let inserted_count = 0
    let updated_count = 0

    // 新規フレーズを一括 INSERT
    if (toInsert.length > 0) {
      const { data, error } = await db.from('phrases').insert(toInsert.map(buildRow)).select()
      if (error) throw new Error('フレーズの挿入に失敗しました')
      inserted_count = data?.length ?? 0
    }

    // 既存フレーズを個別 UPDATE（pronunciation / meaning_ja / difficulty 等を刷新）
    for (const p of toUpdate) {
      const id = existingMap.get(p.phrase.toLowerCase())!
      const { error } = await db
        .from('phrases')
        .update(buildRow(p))
        .eq('id', id)
        .eq('user_id', user.id)
      if (error) throw new Error(`フレーズの更新に失敗しました: ${p.phrase}`)
      updated_count++
    }

    return NextResponse.json<SaveResponse>({
      success: true,
      inserted_count,
      updated_count,
      skipped_count: 0,
    })
  } catch (err) {
    log({ level: 'error', endpoint: '/api/admin/save',
      message: err instanceof Error ? err.message : 'unknown_error',
      detail: { phrase_count: phrases.length } })
    return NextResponse.json<SaveResponse>(
      { success: false, inserted_count: 0, updated_count: 0, skipped_count: 0, error: 'フレーズの登録中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
