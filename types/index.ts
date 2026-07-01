export type JudgeStatus = 'correct' | 'partial' | 'incorrect'

export type SourceType = 'YouTube' | 'Podcast' | '議事録' | '英語記事' | 'その他'
export type DeleteReason = 'product_name' | 'not_phrase'
export const DELETE_REASON_LABELS: Record<DeleteReason, string> = {
  product_name: '特定の製品・機能名',
  not_phrase: '慣用句ではない一般的な単語',
}
export type UsageScene = 'daily' | 'technical' | 'business' | 'other'
export type EngineerLevel = 'junior' | 'mid' | 'senior'

export interface Phrase {
  id: string
  phrase: string
  pronunciation: string | null
  meaning_ja: string | null
  source_type: SourceType | null
  source_title: string | null
  source_date: string | null
  original_context: string | null
  added_date: string
  difficulty: number
  usage_scene: UsageScene | null
  engineer_level: EngineerLevel | null
}

export interface ExtractedPhrase {
  phrase: string
  pronunciation: string
  meaning_ja: string
  original_context: string
  difficulty: number
  usage_scene: UsageScene
  engineer_level: EngineerLevel
  /** Claude による関連慣用句の提案フレーズ。DB保存後は通常フレーズと同じ扱い */
  suggested?: boolean
}

export interface ExtractResponse {
  success: boolean
  phrases: ExtractedPhrase[]
  error?: string
}

/** 抽出と同じ Claude 呼び出しで推定するソースのメタ情報（自動タグ）。すべて best-effort */
export interface SourceMeta {
  /** 推定タイトル（日本語可・簡潔）。判定不能なら null */
  title: string | null
  /** テキスト中に明示された日付 YYYY-MM-DD。推測できなければ null */
  date: string | null
  /** テーマタグ（0〜数個） */
  topics: string[]
}

/** extractPhrasesWithClaude の戻り値。meta は取得できなければ null */
export interface ExtractionResult {
  phrases: ExtractedPhrase[]
  meta: SourceMeta | null
}

export interface SaveRequest {
  phrases: ExtractedPhrase[]
  source_type: SourceType
  source_title: string
  source_date?: string
}

export interface SaveResponse {
  success: boolean
  inserted_count: number
  updated_count: number
  skipped_count: number
  error?: string
}

// クイズ履歴
export interface QuizAnswerRecord {
  phrase_id: string
  phrase: string
  meaning_ja: string
  user_answer: string
  is_correct: boolean
  ai_feedback: string
  /** 表示用 + SRS の grade 導出（complete でサーバ側がメモリ上で使用）。quiz_answers には保存しない */
  status?: JudgeStatus
  /** 問題表示から回答送信までのミリ秒。SRS の good/hard 判定にも使う */
  response_time_ms?: number
}

export interface CompleteRequest {
  answers: QuizAnswerRecord[]
  /** 出題モード。session_type 振り分け用（focus→'review' / それ以外→'srs'） */
  mode?: 'normal' | 'focus'
}

export interface HistorySession {
  id: string
  started_at: string
  total_questions: number
  correct_count: number
  answers: {
    phrase: string
    meaning_ja: string
    user_answer: string
    is_correct: boolean
    ai_feedback: string
    answered_at: string
  }[]
}
