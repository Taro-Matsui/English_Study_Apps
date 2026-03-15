export type SourceType = 'DSH_Event' | 'YouTube' | 'Podcast'

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
}

export interface ExtractedPhrase {
  phrase: string
  pronunciation: string
  meaning_ja: string
  original_context: string
  difficulty: number
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
  error?: string
}
