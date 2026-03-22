import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

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

// ── シードキー別フレーズ（各 5選）────────────────────────────────
type SeedKey = StudyPurpose | StudySubcategory | LegacyPurpose
const PURPOSE_PHRASES: Record<SeedKey, typeof COMMON_PHRASES> = {

  // ── ビジネス：一般 ──────────────────────────────────────────
  business_general: [
    {
      phrase: 'bring to the table',
      pronunciation: 'ぶりんぐ とぅ ざ てーぶる',
      meaning_ja: '会議やチームに貢献できる強み・価値を提供する。',
      original_context: "What do you think she brings to the table that other candidates don't?",
      difficulty: 2,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
    {
      phrase: 'in the loop',
      pronunciation: 'いん ざ るーぷ',
      meaning_ja: '最新情報を共有・把握している状態。「keep me in the loop」でよく使われる。',
      original_context: "Please keep me in the loop on any updates from the client.",
      difficulty: 1,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
    {
      phrase: 'at the end of the day',
      pronunciation: 'あっと じ えんど おぶ ざ でい',
      meaning_ja: '結局のところ・最終的に。重要なポイントをまとめる際に使う。',
      original_context: "At the end of the day, customer satisfaction is what matters most.",
      difficulty: 1,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
    {
      phrase: 'going forward',
      pronunciation: 'ごーいんぐ ふぉーわーど',
      meaning_ja: '今後は・これからは。新しい方針や変更を宣言するときに使う。',
      original_context: "Going forward, all meeting notes will be shared on Notion.",
      difficulty: 1,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
    {
      phrase: 'get on board',
      pronunciation: 'げっと おん ぼーど',
      meaning_ja: '賛同する・参加する。計画や新しいやり方を受け入れること。',
      original_context: "We need everyone to get on board with the new workflow before launch.",
      difficulty: 2,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
  ],

  // ── ビジネス：エンジニア ＞ ミーティング・日常会話 ─────────────
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

  // ── ビジネス：エンジニア ＞ コードレビュー・技術ドキュメント ────
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
      phrase: 'under the hood',
      pronunciation: 'あんだー ざ ふっど',
      meaning_ja: '内部的に・裏側で。表面には見えないシステムの内部動作を指す。',
      original_context: "Under the hood, this library uses a binary search tree for efficient lookups.",
      difficulty: 2,
      usage_scene: 'technical',
      engineer_level: 'junior',
    },
  ],

  // ── ビジネス：エンジニア ＞ 採用面接・プレゼン・カンファレンス ──
  conference: [
    {
      phrase: 'walk me through',
      pronunciation: 'うぉーく みー するー',
      meaning_ja: 'ステップごとに説明してもらう。面接や発表でプロセスを説明する際によく使われる。',
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
      phrase: 'room for improvement',
      pronunciation: 'るーむ ふぉー いんぷるーぶめんと',
      meaning_ja: '改善の余地がある・もっとよくなれる部分。弱みを謙虚に表現するときにも使える。',
      original_context: "There's always room for improvement in my public speaking skills.",
      difficulty: 2,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
    {
      phrase: 'take a stab at',
      pronunciation: 'ていく あ すたぶ あっと',
      meaning_ja: '試しにやってみる。正解かどうかわからないが挑戦してみること。',
      original_context: "I'll take a stab at answering that, but feel free to correct me if I'm wrong.",
      difficulty: 3,
      usage_scene: 'business',
      engineer_level: 'mid',
    },
  ],

  // ── 趣味：旅行・ライフスタイル ──────────────────────────────
  hobby_lifestyle: [
    {
      phrase: 'off the beaten track',
      pronunciation: 'おふ ざ びーとん とらっく',
      meaning_ja: '人があまり訪れない穴場・王道ではない場所や体験。',
      original_context: "We wanted to go off the beaten track, so we skipped the touristy areas entirely.",
      difficulty: 3,
      usage_scene: 'daily',
      engineer_level: 'junior',
    },
    {
      phrase: 'bucket list',
      pronunciation: 'ばけっとりすと',
      meaning_ja: '死ぬまでにやりたいことリスト。「それはバケットリストにあった」のように使う。',
      original_context: "Visiting the Northern Lights has been on my bucket list for years.",
      difficulty: 1,
      usage_scene: 'daily',
      engineer_level: 'junior',
    },
    {
      phrase: 'blend in',
      pronunciation: 'ぶれんど いん',
      meaning_ja: '周囲に溶け込む・目立たないようにする。現地の文化や人々に自然になじむこと。',
      original_context: "Dress like the locals if you want to blend in and avoid tourist traps.",
      difficulty: 2,
      usage_scene: 'daily',
      engineer_level: 'junior',
    },
    {
      phrase: 'hidden gem',
      pronunciation: 'ひどん じぇむ',
      meaning_ja: 'あまり知られていないが素晴らしい場所・お店・体験。穴場。',
      original_context: "This little café is a hidden gem — locals only know about it.",
      difficulty: 2,
      usage_scene: 'daily',
      engineer_level: 'junior',
    },
    {
      phrase: 'get a taste of',
      pronunciation: 'げっと あ てーすと おぶ',
      meaning_ja: '～を少し体験する・雰囲気を味わう。食文化に限らず幅広く使える。',
      original_context: "This tour lets you get a taste of local life without the typical tourist experience.",
      difficulty: 2,
      usage_scene: 'daily',
      engineer_level: 'junior',
    },
  ],

  // ── 趣味：小説・読書 ────────────────────────────────────────
  hobby_reading: [
    {
      phrase: 'page-turner',
      pronunciation: 'ぺーじたーなー',
      meaning_ja: '読み始めると止まらない本・作品。「引きつけられて手が離せない」という意味。',
      original_context: "I couldn't put it down — it's a real page-turner from start to finish.",
      difficulty: 2,
      usage_scene: 'daily',
      engineer_level: 'junior',
    },
    {
      phrase: 'plot twist',
      pronunciation: 'ぷろっと ついすと',
      meaning_ja: '物語の予想外の展開・どんでん返し。読者の予測を裏切る場面転換。',
      original_context: "The plot twist in the final chapter completely changed how I saw the whole story.",
      difficulty: 1,
      usage_scene: 'daily',
      engineer_level: 'junior',
    },
    {
      phrase: 'read between the lines',
      pronunciation: 'りーど びとぅいーん ざ らいんず',
      meaning_ja: '行間を読む。明示されていない意図やメッセージを読み取ること。',
      original_context: "You have to read between the lines to understand what the author is really saying.",
      difficulty: 3,
      usage_scene: 'daily',
      engineer_level: 'junior',
    },
    {
      phrase: 'cliffhanger',
      pronunciation: 'くりふはんがー',
      meaning_ja: '結末が宙ぶらりんのまま終わる展開。次が気になってしまうような引き。',
      original_context: "The chapter ends on a cliffhanger — I had to start the next one immediately.",
      difficulty: 2,
      usage_scene: 'daily',
      engineer_level: 'junior',
    },
    {
      phrase: 'in vivid detail',
      pronunciation: 'いん びびっど でぃてーる',
      meaning_ja: '生き生きとした描写で・ありありと。情景や感情が鮮明に伝わる表現。',
      original_context: "The author describes the setting in vivid detail, making you feel like you're really there.",
      difficulty: 2,
      usage_scene: 'daily',
      engineer_level: 'junior',
    },
  ],

  // ── business_engineer: subcategory 未指定時のフォールバック ──
  business_engineer: [
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
      phrase: 'action item',
      pronunciation: 'あくしょん あいてむ',
      meaning_ja: '会議後に誰かが担当する具体的なタスク・宿題。',
      original_context: "The action item from today's meeting is to prepare the demo by Friday.",
      difficulty: 1,
      usage_scene: 'business',
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
      phrase: 'breaking change',
      pronunciation: 'ぶれいきんぐ ちぇんじ',
      meaning_ja: '後方互換性を壊す変更。既存のAPIやインターフェースが変わるため、利用側の修正が必要になる。',
      original_context: "This is a breaking change, so we need to bump the major version and update the migration guide.",
      difficulty: 3,
      usage_scene: 'technical',
      engineer_level: 'mid',
    },
    {
      phrase: 'walk me through',
      pronunciation: 'うぉーく みー するー',
      meaning_ja: 'ステップごとに説明してもらう。面接や発表でプロセスを説明する際によく使われる。',
      original_context: "Could you walk me through your approach to solving this problem?",
      difficulty: 2,
      usage_scene: 'business',
      engineer_level: 'junior',
    },
  ],

  // ── 後方互換：旧 purpose 値 ─────────────────────────────────
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
}

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
    const seedKey: SeedKey = body.study_subcategory ?? body.study_purpose
    const purposePhrases = PURPOSE_PHRASES[seedKey] ?? PURPOSE_PHRASES['business_general']
    const today = new Date().toISOString().split('T')[0]
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
