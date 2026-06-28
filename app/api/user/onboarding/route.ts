import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'
import { resolveSeedKey, buildSeedRows } from '@/lib/seed-phrases'

type StudyPurpose    = 'business_general' | 'business_engineer' | 'hobby_lifestyle' | 'hobby_reading'
type StudySubcategory = 'meeting' | 'review' | 'conference'
type StudyLevel      = 'beginner' | 'intermediate' | 'advanced'

// backward compat: old clients may still send these values
type LegacyPurpose = 'meeting' | 'review' | 'reading' | 'interview' | 'general'

const VALID_PURPOSES: (StudyPurpose | LegacyPurpose)[] = [
  'business_general', 'business_engineer', 'hobby_lifestyle', 'hobby_reading',
  'meeting', 'review', 'reading', 'interview', 'general',
]
const VALID_SUBCATEGORIES: StudySubcategory[] = ['meeting', 'review', 'conference']
const VALID_LEVELS: StudyLevel[] = ['beginner', 'intermediate', 'advanced']
const DOMAIN_MAX_LEN = 100


export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  let body: {
    study_purpose: StudyPurpose | LegacyPurpose
    study_subcategory?: StudySubcategory
    study_level: StudyLevel
    study_domain?: string
  }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 }) }

  if (!VALID_PURPOSES.includes(body.study_purpose))
    return NextResponse.json({ error: '学習目的が不正です' }, { status: 400 })
  if (body.study_subcategory && !VALID_SUBCATEGORIES.includes(body.study_subcategory))
    return NextResponse.json({ error: 'サブカテゴリが不正です' }, { status: 400 })
  if (!VALID_LEVELS.includes(body.study_level))
    return NextResponse.json({ error: 'レベルが不正です' }, { status: 400 })

  const rawDomain = (body.study_domain ?? '').trim()
  const study_domain = rawDomain.slice(0, DOMAIN_MAX_LEN) || undefined

  const db = getSupabaseAdmin()

  // 1. ユーザーメタデータに学習設定を保存
  const metaUpdate: Record<string, unknown> = {
    ...user.user_metadata,
    study_purpose: body.study_purpose,
    study_level: body.study_level,
    study_domain,
    onboarding_complete: true,
  }
  if (body.study_subcategory) {
    metaUpdate.study_subcategory = body.study_subcategory
  } else {
    // subcategoryが空の場合は削除（purpose変更時のクリーンアップ）
    delete metaUpdate.study_subcategory
  }

  const { error: metaError } = await db.auth.admin.updateUserById(user.id, {
    user_metadata: metaUpdate,
  })
  if (metaError) {
    return NextResponse.json({ error: 'ユーザー設定の保存に失敗しました' }, { status: 500 })
  }

  // 2. フレーズが0件の場合のみシードフレーズを挿入
  const { count } = await db
    .from('phrases')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if ((count ?? 0) === 0) {
    // subcategory が指定されていればそれを優先、なければ purpose で引く
    const seedKey = resolveSeedKey(body.study_purpose, body.study_subcategory)
    const today = new Date().toISOString().split('T')[0]
    const rows = buildSeedRows(seedKey, user.id, today)
    const { error: insertError } = await db.from('phrases').insert(rows)
    if (insertError) {
      console.error('[onboarding] seed insert error:', insertError.message)
    }
  }

  return NextResponse.json({ success: true })
}
