import { ExtractedPhrase } from '@/types'

const SYSTEM_PROMPT = `あなたはエンジニアの英語学習を支援するAIです。
与えられた英語テキスト（エンジニアコミュニティの会話録・イベント記録など）から、
実務で頻出する英語フレーズを抽出・分析してください。

以下の基準でフレーズを選定してください：
- エンジニアリング文脈で頻出するコロケーション・イディオム・表現
- 単純な単語ではなく2語以上のフレーズ・表現
- ビジネス・技術コミュニケーションで実際に使われるもの
- 難易度：1（簡単）〜5（難しい）で評価

必ずJSON配列のみを返してください。説明文やコメントは不要です。`

const PURPOSE_LABELS: Record<string, string> = {
  meeting:   'ミーティング・日常会話（チームでのやり取り、口語的な表現を優先）',
  review:    'コードレビュー・Slack（技術的な指摘やカジュアルなビジネス表現を優先）',
  reading:   '技術ドキュメント・論文読解（専門用語、学術的・書き言葉的表現を優先）',
  interview: '採用面接・プレゼン（フォーマルな表現、自己アピール・説明表現を優先）',
  general:   '総合的に学びたい（バランスよく幅広く抽出）',
}
const LEVEL_LABELS: Record<string, string> = {
  beginner:     '初級 → difficulty 1〜3 のフレーズを中心に抽出。難しすぎる表現は避ける',
  intermediate: '中級 → difficulty 2〜4 のフレーズを中心にバランスよく抽出',
  advanced:     '上級 → difficulty 3〜5 の高度な表現も積極的に抽出',
}

export interface UserContext {
  study_purpose?: string
  study_level?: string
}

const USER_PROMPT_TEMPLATE = (text: string, userContext?: UserContext) => `${userContext?.study_purpose || userContext?.study_level ? `## 学習者プロフィール
${userContext.study_purpose ? `- 学習目的: ${PURPOSE_LABELS[userContext.study_purpose] ?? userContext.study_purpose}` : ''}
${userContext.study_level ? `- 英語レベル: ${LEVEL_LABELS[userContext.study_level] ?? userContext.study_level}` : ''}
→ 上記プロフィールに特に有用なフレーズを優先して抽出・難易度を調整してください。

` : ''}以下のテキストから英語フレーズを抽出してください。
目安は40個以上ですが、良質なフレーズが多い場合は60〜80個以上抽出しても構いません。リストアップは多めに行ってください。

テキスト:
---
${text}
---

以下のJSON配列形式で返してください：
[
  {
    "phrase": "フレーズ（英語）",
    "pronunciation": "日本語カタカナ読み（例: データ、むるちくらすたー）",
    "meaning_ja": "日本語での意味・説明",
    "original_context": "元テキストでの使用例文（英語原文から最大120文字で引用）",
    "difficulty": 3,
    "usage_scene": "daily|technical|business|other のいずれか",
    "engineer_level": "junior|mid|senior のいずれか"
  }
]

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

さらに、このテキストのドメイン・技術分野に関連し、**テキストには登場しないが実務で広く使われる重要な慣用句・コロケーション** を10〜15個追加してください。
- エンジニアが日々の業務・MTG・コードレビュー等で頻繁に使う表現を優先
- テキストから抽出したフレーズと重複しないこと
- これらには必ず \`"suggested": true\` フィールドを追加（抽出フレーズには付けない）
- original_context にはその表現の典型的な使用例文を英語で作成`

export async function extractPhrasesWithClaude(text: string, userContext?: UserContext): Promise<ExtractedPhrase[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が設定されていません')

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
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: USER_PROMPT_TEMPLATE(text, userContext) }],
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

  // JSON部分を抽出（```json ... ``` ブロックにも対応）
  const raw: string = content.text.trim()
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/(\[[\s\S]*\])/)
  const jsonStr = jsonMatch ? jsonMatch[1] : raw

  let phrases: ExtractedPhrase[]
  try {
    phrases = JSON.parse(jsonStr)
  } catch {
    // フォールバック: JSON 文字列値内の未エスケープ改行・タブを修正して再試行
    // Claude がoriginal_context に複数行テキストをそのまま入れると JSON が不正になるため
    const sanitized = jsonStr.replace(/"((?:[^"\\]|\\.)*)"/g, (match) =>
      match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
    )
    try {
      phrases = JSON.parse(sanitized)
    } catch {
      // フォールバック2: max_tokens 超過等で JSON が途中で切れた場合の部分回復
      // 完結している { ... } オブジェクトを1つずつ取り出してパースする
      const recovered: ExtractedPhrase[] = []
      let depth = 0
      let start = -1
      for (let i = 0; i < sanitized.length; i++) {
        const ch = sanitized[i]
        if (ch === '{') {
          if (depth === 0) start = i
          depth++
        } else if (ch === '}') {
          depth--
          if (depth === 0 && start !== -1) {
            try { recovered.push(JSON.parse(sanitized.slice(start, i + 1))) } catch { /* skip */ }
            start = -1
          }
        }
      }
      if (recovered.length === 0) {
        throw new Error(`レスポンスをJSONとして解析できませんでした:\n${raw.slice(0, 200)}`)
      }
      // M3: 部分回復を使用した場合は警告ログを残す（サイレントデータ損失の検知用）
      console.warn('[extract-phrases] JSON partial recovery activated, recovered:', recovered.length, 'phrases')
      phrases = recovered
    }
  }

  if (!Array.isArray(phrases)) throw new Error('レスポンスが配列ではありません')

  // 非英語フレーズを除外（CJK・アラビア文字等が phrase フィールドに含まれる場合）
  const nonLatinRe = /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af\u0600-\u06ff]/
  return phrases.filter((p) => p.phrase && p.meaning_ja && !nonLatinRe.test(p.phrase))
}
