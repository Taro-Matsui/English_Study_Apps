'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Lang = 'ja' | 'en'

export const TRANSLATIONS = {
  ja: {
    // scene / level / speed
    scene_daily: '日常会話',
    scene_technical: 'テクニカル',
    scene_business: 'ビジネス',
    scene_other: 'その他',
    level_junior: '初級',
    level_mid: '中級',
    level_senior: '上級',
    speed_fast: '早口',
    speed_normal: '普通',
    speed_slow: 'ゆっくり',

    // home
    tagline: '実際の会話からフレーズを手繰り寄せる',
    nav_quiz: 'クイズ',
    nav_quiz_desc: 'フレーズの意味を答えて学習',
    nav_history: 'チャレンジ記録',
    nav_history_desc: '日々の回答履歴と実績を確認',
    nav_phrases: 'フレーズ一覧',
    nav_phrases_desc: '登録済みフレーズを検索・確認',
    nav_import: 'コンテキストを追加',
    nav_import_desc: '会話・記事・字幕からフレーズを手繰り寄せる',

    // quiz
    quiz_loading: '読み込み中...',
    quiz_empty: 'フレーズが登録されていません',
    quiz_empty_link: 'コンテキストを追加 →',
    quiz_placeholder: '日本語で意味を入力...',
    quiz_submit: '判定する',
    quiz_judging: 'AIが判定中...',
    quiz_speak_phrase: '🔊 フレーズ',
    quiz_correct_meaning: '正解の意味',
    quiz_usage_example: '使用例',
    quiz_next: '次のフレーズ →',
    quiz_see_results: '結果を見る',
    quiz_your_answer: '回答: ',
    quiz_correct_answer: '正解: ',
    status_correct: '✓ 正解！',
    status_partial: '△ 惜しい',
    status_incorrect: '✗ 不正解',
    result_correct: '✓ 正解',
    result_partial: '△ 惜しい',
    result_incorrect: '✗ 不正解',
    done_correct: '正解',
    done_partial: '惜しい',
    done_incorrect: '不正解',
    done_again: 'もう一度',
    done_history: '記録',
    done_home: 'ホーム',
    quiz_explain: '💡 詳しく解説',
    quiz_explaining: 'AI解説中...',

    // history
    history_title: 'チャレンジ記録',
    history_sessions: 'セッション',
    history_total: '総回答数',
    history_correct_count: '正解数',
    history_avg_score: '平均正解率',
    history_empty: 'まだ記録がありません',
    history_start_quiz: 'クイズを始める →',
    history_your_answer: '回答: ',
    history_correct: '正解: ',
    history_q_unit: '問',
    history_correct_prefix: '正解',

    // phrases
    phrases_title: 'フレーズ一覧',
    phrases_search: 'フレーズ・意味で検索...',
    phrases_all: 'すべて',
    phrases_empty: 'フレーズが見つかりません',
    phrases_import_link: 'コンテキストを追加 →',
    phrases_delete_title: 'フレーズを削除しますか？',
    phrases_delete_reason: '削除理由',
    phrases_cancel: 'キャンセル',
    phrases_delete: '削除する',
    phrases_deleting: '削除中...',
    reason_product_name: '特定の製品・機能名',
    reason_not_phrase: '慣用句ではない一般的な単語',
  },
  en: {
    // scene / level / speed
    scene_daily: 'Daily',
    scene_technical: 'Technical',
    scene_business: 'Business',
    scene_other: 'Other',
    level_junior: 'Junior',
    level_mid: 'Mid',
    level_senior: 'Senior',
    speed_fast: 'Fast',
    speed_normal: 'Normal',
    speed_slow: 'Slow',

    // home
    tagline: 'Reel in the words from your real conversations.',
    nav_quiz: 'Quiz',
    nav_quiz_desc: 'Answer phrase meanings to learn',
    nav_history: 'Challenge Records',
    nav_history_desc: 'Review your answers and progress',
    nav_phrases: 'Phrase List',
    nav_phrases_desc: 'Search and browse saved phrases',
    nav_import: 'Add Your Context',
    nav_import_desc: 'Reel in phrases from your real conversations',

    // quiz
    quiz_loading: 'Loading...',
    quiz_empty: 'No phrases registered yet',
    quiz_empty_link: 'Add your context →',
    quiz_placeholder: 'Enter the Japanese meaning...',
    quiz_submit: 'Submit',
    quiz_judging: 'AI is judging...',
    quiz_speak_phrase: '🔊 Phrase',
    quiz_correct_meaning: 'Correct meaning',
    quiz_usage_example: 'Usage example',
    quiz_next: 'Next phrase →',
    quiz_see_results: 'See results',
    quiz_your_answer: 'Your answer: ',
    quiz_correct_answer: 'Correct: ',
    status_correct: '✓ Correct!',
    status_partial: '△ Close',
    status_incorrect: '✗ Incorrect',
    result_correct: '✓ Correct',
    result_partial: '△ Close',
    result_incorrect: '✗ Incorrect',
    done_correct: 'Correct',
    done_partial: 'Close',
    done_incorrect: 'Incorrect',
    done_again: 'Try again',
    done_history: 'Records',
    done_home: 'Home',
    quiz_explain: '💡 Explain more',
    quiz_explaining: 'AI explaining...',

    // history
    history_title: 'Challenge Records',
    history_sessions: 'sessions',
    history_total: 'Total Answered',
    history_correct_count: 'Correct',
    history_avg_score: 'Avg. Score',
    history_empty: 'No records yet',
    history_start_quiz: 'Start a quiz →',
    history_your_answer: 'Answer: ',
    history_correct: 'Correct: ',
    history_q_unit: 'Q',
    history_correct_prefix: 'Correct',

    // phrases
    phrases_title: 'Phrase List',
    phrases_search: 'Search phrases or meanings...',
    phrases_all: 'All',
    phrases_empty: 'No phrases found',
    phrases_import_link: 'Add your context →',
    phrases_delete_title: 'Delete this phrase?',
    phrases_delete_reason: 'Reason for deletion',
    phrases_cancel: 'Cancel',
    phrases_delete: 'Delete',
    phrases_deleting: 'Deleting...',
    reason_product_name: 'Product / feature name',
    reason_not_phrase: 'Not an idiom or set phrase',
  },
} as const

export type TranslationKey = keyof typeof TRANSLATIONS.ja

interface LangContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TranslationKey) => string
}

const LangContext = createContext<LangContextType>({
  lang: 'ja',
  setLang: () => {},
  t: (key) => TRANSLATIONS.ja[key],
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ja')

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved === 'en' || saved === 'ja') setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('lang', l)
  }

  const t = (key: TranslationKey): string => TRANSLATIONS[lang][key]

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LangContext)
}

/** ヘッダーに埋め込む EN/JA トグルボタン */
export function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage()
  return (
    <button
      onClick={() => setLang(lang === 'ja' ? 'en' : 'ja')}
      className={`text-xs px-2.5 py-0.5 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors font-medium ${className}`}
    >
      {lang === 'ja' ? 'EN' : 'JP'}
    </button>
  )
}
