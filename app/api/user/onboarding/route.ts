import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

type StudyPurpose = 'meeting' | 'review' | 'reading' | 'interview' | 'general'
type StudyLevel = 'beginner' | 'intermediate' | 'advanced'

const VALID_PURPOSES: StudyPurpose[] = ['meeting', 'review', 'reading', 'interview', 'general']
const VALID_LEVELS: StudyLevel[] = ['beginner', 'intermediate', 'advanced']

// 初期シードフレーズ（初級〜中級レベルのエンジニア英語 10選）
const SEED_PHRASES = [
  {
    phrase: 'pull request',
    pronunciation: 'ぷるりくえすと',
    meaning_ja: 'コードの変更内容をレビューしてもらうための申請。マージ前に他のエンジニアに確認を依頼する行為。',
    original_context: 'Can you take a look at my pull request? I refactored the authentication module.',
    difficulty: 1,
    usage_scene: 'technical',
    engineer_level: 'junior',
    source_type: 'System',
    source_title: '初期フレーズ',
  },
  {
    phrase: 'LGTM',
    pronunciation: 'える じー てぃー えむ',
    meaning_ja: '"Looks Good To Me" の略。コードレビューで「問題なし・承認します」という意味で使う。',
    original_context: "I've reviewed all the changes. LGTM! Go ahead and merge whenever you're ready.",
    difficulty: 1,
    usage_scene: 'technical',
    engineer_level: 'junior',
    source_type: 'System',
    source_title: '初期フレーズ',
  },
  {
    phrase: 'refactoring',
    pronunciation: 'りふぁくたりんぐ',
    meaning_ja: '外部から見た動作を変えずに、コードの内部構造を改善・整理すること。',
    original_context: "We should schedule some time for refactoring this legacy code before we add new features.",
    difficulty: 2,
    usage_scene: 'technical',
    engineer_level: 'junior',
    source_type: 'System',
    source_title: '初期フレーズ',
  },
  {
    phrase: 'edge case',
    pronunciation: 'えっじ けーす',
    meaning_ja: '通常とは異なる特殊な条件・境界値。バグの温床になりやすく、テスト時に意識すべき入力パターン。',
    original_context: "We need to handle the edge case where the user submits an empty form or uses special characters.",
    difficulty: 2,
    usage_scene: 'technical',
    engineer_level: 'junior',
    source_type: 'System',
    source_title: '初期フレーズ',
  },
  {
    phrase: 'workaround',
    pronunciation: 'わーくあらうんど',
    meaning_ja: '問題の根本解決ではなく、一時的に回避するための手段。暫定対応・応急処置。',
    original_context: "This is just a workaround for now. We'll fix the root cause properly in the next sprint.",
    difficulty: 2,
    usage_scene: 'technical',
    engineer_level: 'junior',
    source_type: 'System',
    source_title: '初期フレーズ',
  },
  {
    phrase: 'bottleneck',
    pronunciation: 'ぼとるねっく',
    meaning_ja: 'システムやプロセス全体の速度を制限している箇所。パフォーマンス問題の原因となる部分。',
    original_context: "The database query is the bottleneck. We need to add an index to speed things up.",
    difficulty: 2,
    usage_scene: 'technical',
    engineer_level: 'junior',
    source_type: 'System',
    source_title: '初期フレーズ',
  },
  {
    phrase: 'breaking change',
    pronunciation: 'ぶれいきんぐ ちぇんじ',
    meaning_ja: '後方互換性を壊す変更。既存のAPIやインターフェースが変わるため、利用側の修正が必要になる。',
    original_context: "This is a breaking change, so we need to bump the major version and update the migration guide.",
    difficulty: 3,
    usage_scene: 'technical',
    engineer_level: 'mid',
    source_type: 'System',
    source_title: '初期フレーズ',
  },
  {
    phrase: 'take ownership',
    pronunciation: 'ていく おーなーしっぷ',
    meaning_ja: 'タスクや問題に対して責任を持ち、主体的に最後まで取り組むこと。',
    original_context: "I'll take ownership of this issue and make sure it gets resolved by end of week.",
    difficulty: 2,
    usage_scene: 'business',
    engineer_level: 'mid',
    source_type: 'System',
    source_title: '初期フレーズ',
  },
  {
    phrase: 'spike',
    pronunciation: 'すぱいく',
    meaning_ja: '技術的な不確実性を解消するための調査・プロトタイプ作業。時間を決めて行う探索的タスク。',
    original_context: "Let's do a spike to evaluate whether this third-party library meets our requirements.",
    difficulty: 3,
    usage_scene: 'technical',
    engineer_level: 'mid',
    source_type: 'System',
    source_title: '初期フレーズ',
  },
  {
    phrase: 'out of scope',
    pronunciation: 'あうと おぶ すこーぷ',
    meaning_ja: '今回の対応範囲外であること。現在のタスクやスプリントに含まれない機能・修正を指す。',
    original_context: "That feature request is out of scope for this sprint. Let's add it to the backlog.",
    difficulty: 2,
    usage_scene: 'business',
    engineer_level: 'junior',
    source_type: 'System',
    source_title: '初期フレーズ',
  },
]

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  let body: { study_purpose: StudyPurpose; study_level: StudyLevel }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 }) }

  if (!VALID_PURPOSES.includes(body.study_purpose))
    return NextResponse.json({ error: '学習目的が不正です' }, { status: 400 })
  if (!VALID_LEVELS.includes(body.study_level))
    return NextResponse.json({ error: 'レベルが不正です' }, { status: 400 })

  const db = getSupabaseAdmin()

  // 1. ユーザーメタデータに学習設定を保存
  const { error: metaError } = await db.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      study_purpose: body.study_purpose,
      study_level: body.study_level,
      onboarding_complete: true,
    },
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
    const today = new Date().toISOString().split('T')[0]
    const rows = SEED_PHRASES.map((p) => ({
      ...p,
      user_id: user.id,
      added_date: today,
    }))
    const { error: insertError } = await db.from('phrases').insert(rows)
    if (insertError) {
      // シード失敗はオンボーディング完了を妨げない（ログだけ残す）
      console.error('[onboarding] seed insert error:', insertError.message)
    }
  }

  return NextResponse.json({ success: true })
}
