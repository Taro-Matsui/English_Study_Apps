import { ExtractedPhrase, SourceMeta, ExtractionResult } from '@/types'
import { AI_MODELS } from '@/lib/ai-models'

const SYSTEM_PROMPT = `あなたはエンジニアの英語学習を支援するAIです。
与えられた英語テキスト（エンジニアコミュニティの会話録・イベント記録など）から、
「聞こえていたが意味を捉えきれていなかった」可能性が高い英語フレーズを選び出してください。

## 抽出の優先順位（高い順）
1. 単語単体は知っているのに、組み合わせ（コロケーション）の意味がわからないもの
   例: "spin up a cluster" → "spin" と "up" は知っていても意味が取りにくい
2. 直訳すると意味が通じないイディオム・慣用句
   例: "table the discussion" → 英米で意味が逆になる
3. ネイティブが当たり前のように使う定型句で、日本語に対応する自然な表現がないもの
   例: "let me circle back on that"

## 抽出しないもの（重要）
- 製品名・会社名・サービス名（Snowflake, GitHub, BigQuery, Slack, AWS 等）
- エンジニアなら誰でも知っている技術単語（query, database, API, PR, bug, deploy 等）
- 意味が一目瞭然な一般英語（I think, that's right, let's go, good point 等）
- 単純な形容詞＋名詞の組み合わせ（new feature, important issue 等）

## フレーズの長さ
- 2〜6語程度のまとまりを基本とする
- 1語の動詞でも日本人エンジニアが使いこなせていない場合は抽出可（例: elaborate, iterate）

## 難易度基準（日本人エンジニア向け）
1: 知っているが自分では使えない定番表現（heads-up, wrap up 等）
2: 意味は推測できるが正確に使えない（circle back, take ownership 等）
3: ネイティブ感覚が必要。直訳が通じない（take a stab at, in the weeds 等）
4: 文脈なしでは意味が掴めない上級コロケーション（under the hood, out of the box 等）
5: ネイティブ同士で使う表現。日本人には馴染みが薄い（punt on, bikeshedding 等）

必ず指定のJSON形式のみを返してください。説明文やコメントは不要です。`

const PURPOSE_LABELS: Record<string, string> = {
  // ビジネス top-level
  business_general:  'ビジネス一般（会議・メール・プレゼン・日常的な職場コミュニケーション全般。エンジニア固有の技術用語は優先しない）',
  business_engineer: 'エンジニア向けビジネス英語（技術系の職場でのコミュニケーション全般）',
  // エンジニア サブカテゴリ
  meeting:           'エンジニアのミーティング・日常会話（チームでのやり取り、口語的な表現を優先）',
  review:            'コードレビュー・Slack・技術ドキュメント（技術的な指摘、書き言葉・専門用語を含む）',
  conference:        '採用面接・プレゼン・カンファレンス（フォーマルな表現、発表・質疑応答表現を優先）',
  // 趣味
  hobby_lifestyle:   '趣味・ライフスタイル（旅行・グルメ・ワイン・スポーツ等の日常会話・体験記表現を優先。エンジニア・ビジネス用語は不要）',
  hobby_reading:     '小説・読書（文学的な叙述・感情表現・比喩・慣用句を優先。日常会話や技術用語は不要）',
  // 後方互換（旧 purpose 値）
  reading:           '技術ドキュメント・論文読解（専門用語、学術的・書き言葉的表現を優先）',
  interview:         '採用面接・プレゼン（フォーマルな表現、自己アピール・説明表現を優先）',
  general:           '総合的に学びたい（バランスよく幅広く抽出）',
}
const LEVEL_LABELS: Record<string, string> = {
  beginner:     '初級 → difficulty 1〜3 のフレーズを中心に抽出。難しすぎる表現は避ける',
  intermediate: '中級 → difficulty 2〜4 のフレーズを中心にバランスよく抽出',
  advanced:     '上級 → difficulty 3〜5 の高度な表現も積極的に抽出',
}

export interface UserContext {
  study_purpose?: string
  study_subcategory?: string  // エンジニアのサブカテゴリ (meeting / review / conference)
  study_level?: string
  study_domain?: string
}

const USER_PROMPT_TEMPLATE = (text: string, userContext?: UserContext, maxPhrases = 30, maxSuggested = 10) => {
  const hasContext = userContext?.study_purpose || userContext?.study_level || userContext?.study_domain
  // サブカテゴリ優先（business_engineer + subcategory の場合はサブカテゴリが主目的を表す）
  const effectivePurpose = userContext?.study_subcategory ?? userContext?.study_purpose
  const contextSection = hasContext ? `## 学習者プロフィール
${effectivePurpose ? `- 学習目的: ${PURPOSE_LABELS[effectivePurpose] ?? effectivePurpose}` : ''}
${userContext!.study_level ? `- 英語レベル: ${LEVEL_LABELS[userContext!.study_level] ?? userContext!.study_level}` : ''}
${userContext!.study_domain ? `- 特に学びたい専門領域や興味・趣味: ${userContext!.study_domain}（この領域に関連する専門用語・表現を優先して抽出）` : ''}
→ 上記プロフィールに特に有用なフレーズを優先して抽出・難易度を調整してください。

` : ''
  return `${contextSection}以下のテキストから英語フレーズを抽出してください。
目安は${maxPhrases}個程度（良質なフレーズが多い場合は最大${Math.round(maxPhrases * 1.3)}個まで）。リストアップは多めに行ってください。

テキスト:
---
${text}
---

以下のJSON形式で返してください（先頭に source、続けて phrases の順）：
{
  "source": {
    "title": "このテキストの内容を表す簡潔なタイトル（日本語可・30字以内。会議名・記事見出し・動画タイトル・イベント名などを推定）",
    "date": "テキスト中に明示された日付があれば YYYY-MM-DD。無ければ null（推測で埋めない）",
    "topics": ["主要テーマを1〜4語で2〜4個（例: スプリント計画, CI/CD）"]
  },
  "phrases": [
    {
      "phrase": "フレーズ（英語）",
      "pronunciation": "日本語カタカナ読み（例: データ、むるちくらすたー）",
      "meaning_ja": "日本語での意味・説明（下記の書き方を参照）",
      "original_context": "元テキストでの使用例文（英語原文から最大120文字で引用）",
      "difficulty": 3,
      "usage_scene": "daily|technical|business|other のいずれか",
      "engineer_level": "junior|mid|senior のいずれか"
    }
  ]
}

meaning_ja の書き方：
- フレーズ単体の一般的な意味を核心として書く（文脈に依存しない普遍的な意味）
- このテキストでの使われ方に特有のニュアンスがあれば「／ここでは〜」と補足する
- 例: "前もって知らせること／ここでは「先行して情報共有する」意味で使用"
- 字数目安: 30〜60字

pronunciation の書き方：
- 日本人エンジニアが英語を聞いたときの「実際の音の雰囲気」をカタカナで表現してください
- 辞書的な外来語表記（データ）ではなく、ネイティブの発音に近いカタカナ（でらー）を使うこと
- 例: "data" → "でらー", "cluster" → "くらすたー", "multicluster" → "むるちくらすたー"
- 例: "leverage" → "れヴぁりじ", "deploy" → "でぷろい", "architecture" → "あーきてくちゃー"
- 長音は「ー」で表現、促音は「っ」を使う

usage_scene の選び方：
- daily: 日常的な会話や雑談でも使われる汎用表現
- technical: コード・アーキテクチャ・インフラなど技術的な場面で使う専門的表現
- business: 会議・提案・交渉など職業的コミュニケーション場面で使う表現
- other: 上記に分類しにくいもの

engineer_level の選び方：
- junior: 入門〜1年目の初級エンジニアでも理解できる表現
- mid: 実務経験2〜4年の中級エンジニアが使いこなす表現
- senior: シニア・リーダー層が多用する高度な表現

さらに、このテキストのドメイン・技術分野に関連し、**テキストには登場しないが実務で広く使われる重要な慣用句・コロケーション** を${maxSuggested}個程度追加してください。
- このテキストのトピック・場面と直接関連するものに限る（無関係な表現は追加しない）
- 同じ場面でネイティブが実際に使う可能性が高いもの
- すでに抽出したフレーズと重複・類似しないこと
- これらには必ず \`"suggested": true\` フィールドを追加（抽出フレーズには付けない）
- original_context には「このフレーズが実際に使われそうな典型的な一文」を英語で作成`
}

export async function extractPhrasesWithClaude(text: string, userContext?: UserContext): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が設定されていません')

  // テキスト長に応じて出力件数・トークン上限を調整
  // モデルは AI_MODELS.EXTRACT で一元管理（環境変数で上書き可能）
  const isShort = text.length < 10_000
  const model = AI_MODELS.EXTRACT
  const maxTokens = isShort ? 4096 : 8192
  const maxPhrases = isShort ? 15 : 30
  const maxSuggested = isShort ? 5 : 10

  // SDK の代わりに fetch を直接使用（Next.js 環境での接続問題を回避）
  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: USER_PROMPT_TEMPLATE(text, userContext, maxPhrases, maxSuggested) }],
    }),
  })
  } catch (err) {
    const cause = (err as NodeJS.ErrnoException)?.cause as NodeJS.ErrnoException | undefined
    const detail = cause?.code ?? cause?.message ?? (err instanceof Error ? err.message : String(err))
    console.error('[extract-phrases] fetch error:', detail)
    // C2: 内部エラー詳細はログのみ。クライアントへは汎用メッセージを返す
    throw new Error('Anthropic API への接続に失敗しました')
  }

  if (!res.ok) {
    const body = await res.text()
    // C2: APIレスポンス本文はサーバーログのみ。ステータスコードのみ伝播させる
    console.error('[extract-phrases] API error response:', res.status, body.slice(0, 300))
    throw new Error(`Anthropic API エラー (${res.status})`)
  }

  const data = await res.json()
  const content = data.content?.[0]
  if (!content || content.type !== 'text') {
    throw new Error('Claude API から予期しないレスポンス形式が返されました')
  }

  return parseExtractionResponse(content.text)
}

// 非英語フレーズ検知（CJK・アラビア文字等が phrase フィールドに含まれる場合）
const NON_LATIN_RE = /[一-鿿぀-ヿ가-힯؀-ۿ]/

function cleanPhrases(arr: unknown): ExtractedPhrase[] {
  if (!Array.isArray(arr)) return []
  return (arr as ExtractedPhrase[]).filter(
    (p) => p && p.phrase && p.meaning_ja && !NON_LATIN_RE.test(p.phrase)
  )
}

/** source オブジェクトを SourceMeta に正規化。有効な値が無ければ null */
function normalizeMeta(src: unknown): SourceMeta | null {
  if (!src || typeof src !== 'object') return null
  const s = src as Record<string, unknown>
  const title = typeof s.title === 'string' && s.title.trim() ? s.title.trim().slice(0, 60) : null
  const dateRaw = typeof s.date === 'string' ? s.date.trim() : ''
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null
  const topics = Array.isArray(s.topics)
    ? s.topics
        .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().slice(0, 30))
        .slice(0, 6)
    : []
  if (!title && !date && topics.length === 0) return null
  return { title, date, topics }
}

/**
 * Claude のレスポンス文字列を { phrases, meta } に変換する純関数。
 * 新形式 `{ source, phrases }` を優先し、旧形式（素の配列）や max_tokens 切断にもフォールバックする。
 * phrase 抽出は best-effort な meta より優先し、従来の堅牢性を維持する（回復不能な場合のみ throw）。
 */
export function parseExtractionResponse(raw: string): ExtractionResult {
  const text = (raw ?? '').trim()
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/)
  const candidate = fenced ? fenced[1] : text
  const objMatch = candidate.match(/\{[\s\S]*\}/)
  const arrMatch = candidate.match(/\[[\s\S]*\]/)
  const sanitize = (str: string) =>
    str.replace(/"((?:[^"\\]|\\.)*)"/g, (m) => m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t'))

  // fromObject=true（{source,phrases}形式）なら空配列でも確定（正当な抽出ゼロを尊重）。
  // 配列形式は topics 等の別配列を誤取得しうるため、phrase を1件以上含む時のみ確定する。
  const tryParse = (str: string): { res: ExtractionResult; fromObject: boolean } | null => {
    let obj: unknown
    try { obj = JSON.parse(str) } catch { return null }
    if (Array.isArray(obj)) return { res: { phrases: cleanPhrases(obj), meta: null }, fromObject: false }
    if (obj && typeof obj === 'object' && Array.isArray((obj as Record<string, unknown>).phrases)) {
      const o = obj as Record<string, unknown>
      return { res: { phrases: cleanPhrases(o.phrases), meta: normalizeMeta(o.source) }, fromObject: true }
    }
    return null
  }

  // fromObject（{source,phrases}）は空配列でも確定。配列形式は phrase を1件以上含む時のみ確定
  // （topics 等の別配列の誤取得を避ける）。有効な JSON を一度でも見たら sawValidJson を立て、
  // 最終的に phrase ゼロでも「正当な抽出ゼロ」として空返しする（旧挙動＝素の [] を許容）ために使う。
  let sawValidJson = false
  const scan = (transform: (s: string) => string): ExtractionResult | null => {
    for (const c of [candidate, objMatch?.[0], arrMatch?.[0]]) {
      if (!c) continue
      const t = tryParse(transform(c))
      if (!t) continue
      sawValidJson = true
      if (t.fromObject || t.res.phrases.length > 0) return t.res
    }
    return null
  }
  const direct = scan((s) => s)
  if (direct) return direct
  const sanitized = scan(sanitize)
  if (sanitized) return sanitized

  // 3. 部分回復: phrases 配列の中身から完結した {…} を拾う（切断対応）。source は best-effort
  const s = sanitize(candidate)
  const pIdx = s.indexOf('"phrases"')
  const arrStart = pIdx >= 0 ? s.indexOf('[', pIdx) : -1
  const scanFrom = arrStart >= 0 ? arrStart + 1 : 0
  const recovered: unknown[] = []
  let depth = 0
  let start = -1
  for (let i = scanFrom; i < s.length; i++) {
    const ch = s[i]
    if (ch === '{') { if (depth === 0) start = i; depth++ }
    else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        try { recovered.push(JSON.parse(s.slice(start, i + 1))) } catch { /* skip */ }
        start = -1
      }
    }
  }
  const phrases = cleanPhrases(recovered)
  if (phrases.length === 0) {
    if (sawValidJson) return { phrases: [], meta: null }  // 正当な抽出ゼロ（素の [] 等）は throw しない
    throw new Error(`レスポンスをJSONとして解析できませんでした:\n${text.slice(0, 200)}`)
  }
  let meta: SourceMeta | null = null
  const sMatch = s.match(/"source"\s*:\s*(\{[\s\S]*?\})/)
  if (sMatch) { try { meta = normalizeMeta(JSON.parse(sMatch[1])) } catch { meta = null } }
  console.warn('[extract-phrases] JSON partial recovery activated, recovered:', phrases.length, 'phrases')
  return { phrases, meta }
}
