export type SourceType = 'DSH_Event' | 'YouTube' | 'Podcast'
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
}

export interface ExtractResponse {
  success: boolean
  phrases: ExtractedPhrase[]
  error?: string
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
}

export interface CompleteRequest {
  answers: QuizAnswerRecord[]
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
