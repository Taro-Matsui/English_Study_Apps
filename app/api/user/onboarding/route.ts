import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

type StudyPurpose = 'meeting' | 'review' | 'reading' | 'interview' | 'general'
type StudyLevel = 'beginner' | 'intermediate' | 'advanced'

const VALID_PURPOSES: StudyPurpose[] = ['meeting', 'review', 'reading', 'interview', 'general']
const VALID_LEVELS: StudyLevel[] = ['beginner', 'intermediate', 'advanced']
const DOMAIN_MAX_LEN = 100

// ── 汎用フレーズ（全 purpose 共通 5選）──────────────────────────
const COMMON_PHRASES = [
  {
    phrase: 'heads-up',
    pronunciation: 'へっずあっぷ',
    meaning_ja: '事前の通知・予告。相手に前もって知らせること。',
    original_context: "Just a heads-up — the meeting has been moved to 3 PM.",
    difficulty: 1,
    usage_scene: 'business',
    engineer_level: 'junior',
  },
  {
    phrase: 'circle back',
    pronunciation: 'さーくるばっく',
    meaning_ja: '後で改めて話し合う・再度確認する。いったん後回しにして後で戻ること。',
    original_context: "Let's circle back on this after we get more data.",
    difficulty: 2,
    usage_scene: 'business',
    engineer_level: 'junior',
  },
  {
    phrase: 'on the same page',
    pronunciation: 'おん ざ せいむ ぺーじ',
    meaning_ja: '同じ認識・共通の理解を持っている状態。',
    original_context: "Before we start, let's make sure we're all on the same page.",
    difficulty: 1,
    usage_scene: 'business',
    engineer_level: 'junior',
  },
  {
    phrase: 'take ownership',
    pronunciation: 'ていく おーなーしっぷ',
    meaning_ja: 'タスクや問題に対して責任を持ち、主体的に最後まで取り組むこと。',
    original_context: "I'll take ownership of this issue and make sure it gets resolved by end of week.",
    difficulty: 2,
    usage_scene: 'business',
    engineer_level: 'mid',
  },
  {
    phrase: 'bandwidth',
    pronunciation: 'ばんどうぃず',
    meaning_ja: '時間的余裕・処理能力。「今その余裕がある？」という文脈で使われる。',
    original_context: "Do you have the bandwidth to take on another project this sprint?",
    difficulty: 2,
    usage_scene: 'business',
    engineer_level: 'mid',
  },
]

// ── purpose 別フレーズ（各 5選）─────────────────────────────────
const PURPOSE_PHRASES: Record<StudyPurpose, typeof COMMON_PHRASES> = {
  meeting: [
    {
      phrase: 'touch base',
      pronunciation: 'たっちべーす',
      meaning_ja: '簡単に連絡を取り合う・状況確認をする。',
      original_context: "Can we touch base tomorrow to sync on the project status?",
      difficulty: 1,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
    {
      phrase: 'table a discussion',
      pronunciation: 'てーぶる あ ぃすかっしょん',
      meaning_ja: '議題を一旦保留にする（米: 後回し、英: 提案する。米語の意味に注意）。',
      original_context: "Let's table this discussion and revisit it next week when we have more information.",
      difficulty: 3,
      usage_scene: 'business',
      engineer_level: 'mid',
    },
    {
      phrase: 'action item',
      pronunciation: 'あくしょん あいてむ',
      meaning_ja: '会議後に誰かが担当する具体的なタスク・宿題。',
      original_context: "The action item from today's meeting is to prepare the demo by Friday.",
      difficulty: 1,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
    {
      phrase: 'wrap up',
      pronunciation: 'らっぷあっぷ',
      meaning_ja: '締めくくる・終わりにする。会議や作業の終了を示す。',
      original_context: "We're running low on time — let's wrap up and send a summary.",
      difficulty: 1,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
    {
      phrase: 'standing meeting',
      pronunciation: 'すたんでぃんぐ みーてぃんぐ',
      meaning_ja: '定期的に繰り返す会議（スタンドアップと区別して使われることも）。',
      original_context: "We have a standing meeting every Monday morning to align on priorities.",
      difficulty: 2,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
  ],
  review: [
    {
      phrase: 'pull request',
      pronunciation: 'ぷるりくえすと',
      meaning_ja: 'コードの変更内容をレビューしてもらうための申請。マージ前に他のエンジニアに確認を依頼する行為。',
      original_context: "Can you take a look at my pull request? I refactored the authentication module.",
      difficulty: 1,
      usage_scene: 'technical',
      engineer_level: 'junior',
    },
    {
      phrase: 'LGTM',
      pronunciation: 'える じー てぃー えむ',
      meaning_ja: '"Looks Good To Me" の略。コードレビューで「問題なし・承認します」という意味で使う。',
      original_context: "I've reviewed all the changes. LGTM! Go ahead and merge whenever you're ready.",
      difficulty: 1,
      usage_scene: 'technical',
      engineer_level: 'junior',
    },
    {
      phrase: 'nit',
      pronunciation: 'にっと',
      meaning_ja: '"nitpick" の略。些細な指摘。マージを妨げるほどではないが改善できる点。',
      original_context: "Nit: could you rename this variable to something more descriptive?",
      difficulty: 2,
      usage_scene: 'technical',
      engineer_level: 'junior',
    },
    {
      phrase: 'breaking change',
      pronunciation: 'ぶれいきんぐ ちぇんじ',
      meaning_ja: '後方互換性を壊す変更。既存のAPIやインターフェースが変わるため、利用側の修正が必要になる。',
      original_context: "This is a breaking change, so we need to bump the major version and update the migration guide.",
      difficulty: 3,
      usage_scene: 'technical',
      engineer_level: 'mid',
    },
    {
      phrase: 'address in a follow-up',
      pronunciation: 'あどれす いん あ ふぉろーあっぷ',
      meaning_ja: '後続のPRや次回の対応で解決する。今回のスコープ外として先送りにすること。',
      original_context: "This is out of scope for this PR — let's address it in a follow-up.",
      difficulty: 2,
      usage_scene: 'technical',
      engineer_level: 'mid',
    },
  ],
  reading: [
    {
      phrase: 'deprecated',
      pronunciation: 'でぷれけいてぃど',
      meaning_ja: '非推奨・廃止予定。将来的に削除される機能や構文を示す。',
      original_context: "This API endpoint is deprecated and will be removed in v3.0. Please use the new endpoint instead.",
      difficulty: 2,
      usage_scene: 'technical',
      engineer_level: 'junior',
    },
    {
      phrase: 'prerequisite',
      pronunciation: 'ぷりれくぃじっと',
      meaning_ja: '前提条件・事前に必要なもの。インストールや設定が必要な依存関係など。',
      original_context: "Before proceeding, make sure you've installed all prerequisites listed in the README.",
      difficulty: 2,
      usage_scene: 'technical',
      engineer_level: 'junior',
    },
    {
      phrase: 'under the hood',
      pronunciation: 'あんだー ざ ふっど',
      meaning_ja: '内部的に・裏側で。表面には見えないシステムの内部動作を指す。',
      original_context: "Under the hood, this library uses a binary search tree for efficient lookups.",
      difficulty: 2,
      usage_scene: 'technical',
      engineer_level: 'junior',
    },
    {
      phrase: 'at a high level',
      pronunciation: 'あっと あ はい れべる',
      meaning_ja: '概要として・大まかに見て。細部ではなく全体像の説明。',
      original_context: "At a high level, the architecture consists of three layers: presentation, business logic, and data.",
      difficulty: 1,
      usage_scene: 'technical',
      engineer_level: 'junior',
    },
    {
      phrase: 'out of scope',
      pronunciation: 'あうと おぶ すこーぷ',
      meaning_ja: '今回の対応範囲外であること。現在のタスクやスプリントに含まれない機能・修正を指す。',
      original_context: "That feature request is out of scope for this sprint. Let's add it to the backlog.",
      difficulty: 2,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
  ],
  interview: [
    {
      phrase: 'walk me through',
      pronunciation: 'うぉーく みー するー',
      meaning_ja: 'ステップごとに説明してもらう。面接で経験やプロセスを説明する際によく使われる。',
      original_context: "Could you walk me through your approach to solving this problem?",
      difficulty: 2,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
    {
      phrase: 'elaborate on',
      pronunciation: 'いらぼれいと おん',
      meaning_ja: '～について詳しく説明する。もう少し詳細を教えてほしいときに使う。',
      original_context: "Could you elaborate on your experience with distributed systems?",
      difficulty: 3,
      usage_scene: 'business',
      engineer_level: 'mid',
    },
    {
      phrase: 'in terms of',
      pronunciation: 'いん たーむず おぶ',
      meaning_ja: '～の観点から・～に関しては。回答を構造的に説明するときに使う。',
      original_context: "In terms of scalability, our solution handles up to 10,000 concurrent users.",
      difficulty: 2,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
    {
      phrase: 'greatest strength',
      pronunciation: 'ぐれいてすと すとれんぐす',
      meaning_ja: '最大の強み。「What\'s your greatest strength?」は面接の定番質問。',
      original_context: "My greatest strength is my ability to break down complex problems into manageable steps.",
      difficulty: 1,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
    {
      phrase: 'room for improvement',
      pronunciation: 'るーむ ふぉー いんぷるーぶめんと',
      meaning_ja: '改善の余地がある・もっとよくなれる部分。弱みを謙虚に表現するときにも使える。',
      original_context: "There's always room for improvement in my public speaking skills.",
      difficulty: 2,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
  ],
  general: [
    {
      phrase: 'leverage',
      pronunciation: 'れぼりっじ',
      meaning_ja: '活用する・うまく利用する（動詞）。強みや既存リソースを最大限に使うこと。',
      original_context: "We should leverage our existing infrastructure rather than building from scratch.",
      difficulty: 2,
      usage_scene: 'business',
      engineer_level: 'mid',
    },
    {
      phrase: 'low-hanging fruit',
      pronunciation: 'ろーはんぎんぐ ふるーと',
      meaning_ja: '簡単に達成できる目標・すぐに手に入る成果。労力の少ない改善点。',
      original_context: "Let's start with the low-hanging fruit and tackle the easier wins first.",
      difficulty: 2,
      usage_scene: 'business',
      engineer_level: 'mid',
    },
    {
      phrase: 'move the needle',
      pronunciation: 'むーぶ ざ にーどる',
      meaning_ja: '状況を改善する・成果を出す。指標や状況を変化させるインパクトを与えること。',
      original_context: "We need initiatives that actually move the needle on user retention.",
      difficulty: 3,
      usage_scene: 'business',
      engineer_level: 'mid',
    },
    {
      phrase: 'bottleneck',
      pronunciation: 'ぼとるねっく',
      meaning_ja: 'システムやプロセス全体の速度を制限している箇所。パフォーマンス問題の原因。',
      original_context: "The database query is the bottleneck. We need to add an index to speed things up.",
      difficulty: 2,
      usage_scene: 'technical',
      engineer_level: 'junior',
    },
    {
      phrase: 'workaround',
      pronunciation: 'わーくあらうんど',
      meaning_ja: '問題の根本解決ではなく、一時的に回避するための手段。暫定対応・応急処置。',
      original_context: "This is just a workaround for now. We'll fix the root cause properly in the next sprint.",
      difficulty: 2,
      usage_scene: 'technical',
      engineer_level: 'junior',
    },
  ],
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  let body: { study_purpose: StudyPurpose; study_level: StudyLevel; study_domain?: string }
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'リクエストの解析に失敗しました' }, { status: 400 }) }

  if (!VALID_PURPOSES.includes(body.study_purpose))
    return NextResponse.json({ error: '学習目的が不正です' }, { status: 400 })
  if (!VALID_LEVELS.includes(body.study_level))
    return NextResponse.json({ error: 'レベルが不正です' }, { status: 400 })

  const rawDomain = (body.study_domain ?? '').trim()
  const study_domain = rawDomain.slice(0, DOMAIN_MAX_LEN) || undefined

  const db = getSupabaseAdmin()

  // 1. ユーザーメタデータに学習設定を保存
  const { error: metaError } = await db.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...user.user_metadata,
      study_purpose: body.study_purpose,
      study_level: body.study_level,
      study_domain,
      onboarding_complete: true,
    },
  })
  if (metaError) {
    return NextResponse.json({ error: 'ユーザー設定の保存に失敗しました' }, { status: 500 })
  }

  // 2. フレーズが0件の場合のみシードフレーズを挿入（purpose 別）
  const { count } = await db
    .from('phrases')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if ((count ?? 0) === 0) {
    const today = new Date().toISOString().split('T')[0]
    const purposePhrases = PURPOSE_PHRASES[body.study_purpose] ?? PURPOSE_PHRASES['general']
    const rows = [...COMMON_PHRASES, ...purposePhrases].map((p) => ({
      ...p,
      user_id: user.id,
      added_date: today,
      source_type: 'System',
      source_title: '初期フレーズ',
    }))
    const { error: insertError } = await db.from('phrases').insert(rows)
    if (insertError) {
      console.error('[onboarding] seed insert error:', insertError.message)
    }
  }

  return NextResponse.json({ success: true })
}
