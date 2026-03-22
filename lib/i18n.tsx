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
    tagline: '会話からフレーズをPickして学ぼう',
    nav_quiz: 'チャレンジ',
    nav_quiz_desc: 'ピックしたフレーズを練習しよう',
    nav_history: 'チャレンジ記録',
    nav_history_desc: '連続日数や正解率を確認',
    nav_phrases: 'マイピックリスト',
    nav_phrases_desc: 'ピックしたフレーズを検索・確認',
    nav_import: '出会いから英語をピックする',
    nav_import_desc: '会話録・記事・字幕を追加してピックが始まります',

    // quiz
    quiz_loading: '読み込み中...',
    quiz_empty: 'まだPickがありません',
    quiz_empty_link: '出会いから英語をピックする →',
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
    status_correct: 'Good Pick! 🎸',
    status_partial: 'Almost! 🎸',
    status_incorrect: "Let's Repick this one.",
    result_correct: 'Good Pick!',
    result_partial: 'Almost!',
    result_incorrect: 'Repick',
    done_correct: 'Good Pick',
    done_partial: 'Almost',
    done_incorrect: 'Repick',
    done_again: 'もう一度',
    done_history: 'チャレンジ記録',
    done_home: 'ホーム',
    quiz_explain: '💡 詳しく解説',
    quiz_explaining: 'AI解説中...',

    // history
    history_title: 'チャレンジ記録',
    history_sessions: 'セッション',
    history_total: '総回答数',
    history_correct_count: '正解数',
    history_avg_score: 'Accuracy',
    history_empty: 'まだ記録がありません',
    history_start_quiz: 'チャレンジを始める →',
    history_your_answer: '回答: ',
    history_correct: '正解: ',
    history_q_unit: '問',
    history_correct_prefix: '正解',

    // phrases
    phrases_title: 'マイピックリスト',
    phrases_search: 'フレーズ・意味で検索...',
    phrases_all: 'すべて',
    phrases_empty: 'フレーズが見つかりません',
    phrases_import_link: '出会いから英語をピックする →',
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
    tagline: 'Pick the words from your real conversations.',
    nav_quiz: 'Challenge',
    nav_quiz_desc: "Challenge yourself with your Picked phrases",
    nav_history: 'Records',
    nav_history_desc: 'Track your streak and accuracy',
    nav_phrases: 'My Picks',
    nav_phrases_desc: 'Search your Picked phrases',
    nav_import: 'Pick English',
    nav_import_desc: 'Add a source and AI will start Picking',

    // quiz
    quiz_loading: 'Loading...',
    quiz_empty: 'No Picks yet',
    quiz_empty_link: 'Pick English →',
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
    status_correct: 'Good Pick! 🎸',
    status_partial: 'Almost! 🎸',
    status_incorrect: "Let's Repick this one.",
    result_correct: 'Good Pick!',
    result_partial: 'Almost!',
    result_incorrect: 'Repick',
    done_correct: 'Good Pick',
    done_partial: 'Almost',
    done_incorrect: 'Repick',
    done_again: 'Try again',
    done_history: 'Records',
    done_home: 'Home',
    quiz_explain: '💡 Explain more',
    quiz_explaining: 'AI explaining...',

    // history
    history_title: 'Records',
    history_sessions: 'sessions',
    history_total: 'Total Answered',
    history_correct_count: 'Correct',
    history_avg_score: 'Accuracy',
    history_empty: 'No records yet',
    history_start_quiz: 'Start Challenge →',
    history_your_answer: 'Answer: ',
    history_correct: 'Correct: ',
    history_q_unit: 'Q',
    history_correct_prefix: 'Correct',

    // phrases
    phrases_title: 'My Picks',
    phrases_search: 'Search phrases or meanings...',
    phrases_all: 'All',
    phrases_empty: 'No phrases found',
    phrases_import_link: 'Pick English →',
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
