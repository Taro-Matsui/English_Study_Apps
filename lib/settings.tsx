'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type VoicePreset = 'default' | 'us-female' | 'us-male' | 'indian' | 'custom'
export type ColorTheme = 'light' | 'dark' | 'system'

interface Settings {
  voicePreset: VoicePreset  // 音声プリセット
  voiceURI: string | null   // voicePreset === 'custom' のときのみ使用
  skipMastered: boolean
  masteredIds: string[]
  contextHint: boolean        // クイズ中にコンテキスト文（フレーズマスク済み）を表示
  showPronunciation: boolean  // フレーズ一覧でカタカナ発音を表示（デフォルト OFF）
  colorTheme: ColorTheme      // 外観テーマ
}

interface SettingsContextType {
  settings: Settings
  setVoicePreset: (preset: VoicePreset) => void
  setVoice: (uri: string | null) => void
  setSkipMastered: (v: boolean) => void
  setContextHint: (v: boolean) => void
  setShowPronunciation: (v: boolean) => void
  setColorTheme: (theme: ColorTheme) => void
  markMastered: (phraseId: string) => void
  clearMastered: () => void
}

const DEFAULT: Settings = {
  voicePreset: 'default',
  voiceURI: null,
  skipMastered: false,
  masteredIds: [],
  contextHint: false,
  showPronunciation: false,
  colorTheme: 'light',
}
const KEY = 'app_settings'

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT,
  setVoicePreset: () => {},
  setVoice: () => {},
  setSkipMastered: () => {},
  setContextHint: () => {},
  setShowPronunciation: () => {},
  setColorTheme: () => {},
  markMastered: () => {},
  clearMastered: () => {},
})

function persist(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {}
}

// -------- ブラウザ音声のキーワードマッチ --------
const FEMALE_KW = ['samantha', 'zira', 'victoria', 'karen', 'moira', 'ava', 'fiona', 'kate',
  'susan', 'allison', 'google us english', 'female', 'woman']
const MALE_KW   = ['alex', 'fred', 'david', 'daniel', 'mark', 'arthur', 'gordon', 'oliver',
  'thomas', 'lee', 'james', 'rishi']

/** プリセットに対応する SpeechSynthesisVoice を返す（クライアント専用）*/
export function getVoiceForPreset(
  preset: VoicePreset,
  customURI: string | null,
): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined') return null
  if (preset === 'default') return null

  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  if (preset === 'custom' && customURI) {
    return voices.find((v) => v.voiceURI === customURI) ?? null
  }

  if (preset === 'indian') {
    return (
      voices.find((v) => v.lang.startsWith('en-IN')) ??
      voices.find((v) => v.lang.startsWith('en_IN')) ??
      voices.find((v) => v.name.toLowerCase().includes('rishi')) ??
      voices.find((v) => v.name.toLowerCase().includes('india')) ??
      null
    )
  }

  const enUS = voices.filter((v) => v.lang === 'en-US' || v.lang === 'en_US')
  const allEn = voices.filter((v) => v.lang.startsWith('en'))

  if (preset === 'us-female') {
    return (
      enUS.find((v) => FEMALE_KW.some((k) => v.name.toLowerCase().includes(k))) ??
      allEn.find((v) => FEMALE_KW.some((k) => v.name.toLowerCase().includes(k))) ??
      enUS[0] ?? allEn[0] ?? null
    )
  }

  if (preset === 'us-male') {
    return (
      enUS.find((v) => MALE_KW.some((k) => v.name.toLowerCase().includes(k))) ??
      allEn.find((v) => MALE_KW.some((k) => v.name.toLowerCase().includes(k))) ??
      (enUS.length > 1 ? enUS[1] : enUS[0]) ?? allEn[1] ?? allEn[0] ?? null
    )
  }

  return null
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT)

  useEffect(() => {
    // 1. localStorage から復元
    let local: Settings = DEFAULT
    try {
      const saved = localStorage.getItem(KEY)
      if (saved) local = { ...DEFAULT, ...JSON.parse(saved) }
    } catch {}
    setSettings(local)

    // 2. DB から習得済み ID を取得してマージ（DB を正とする）
    fetch('/api/user/progress')
      .then((r) => r.ok ? r.json() : null)
      .then((data: { ids: string[] } | null) => {
        if (!data) return
        setSettings((prev) => {
          // DB の ids を正として、localStorage にしかない ids も union する
          const merged = Array.from(new Set([...data.ids, ...prev.masteredIds]))
          const next = { ...prev, masteredIds: merged }
          persist(next)
          return next
        })
      })
      .catch(() => {/* ネットワークエラーは無視（localStorage のみで動作） */})
  }, [])

  function update(fn: (prev: Settings) => Settings) {
    setSettings((prev) => {
      const next = fn(prev)
      persist(next)
      return next
    })
  }

  return (
    <SettingsContext.Provider value={{
      settings,
      setVoicePreset: (preset) => update((p) => ({ ...p, voicePreset: preset })),
      setVoice: (uri) => update((p) => ({ ...p, voiceURI: uri, voicePreset: uri ? 'custom' : 'default' })),
      setSkipMastered: (v) => update((p) => ({ ...p, skipMastered: v })),
      setContextHint: (v) => update((p) => ({ ...p, contextHint: v })),
      setShowPronunciation: (v) => update((p) => ({ ...p, showPronunciation: v })),
      setColorTheme: (theme) => update((p) => ({ ...p, colorTheme: theme })),
      markMastered: (id) => {
        update((p) => ({
          ...p,
          masteredIds: p.masteredIds.includes(id) ? p.masteredIds : [...p.masteredIds, id],
        }))
        // DB に fire-and-forget 同期
        fetch('/api/user/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phrase_id: id }),
        }).catch(() => {})
      },
      clearMastered: () => {
        update((p) => ({ ...p, masteredIds: [] }))
        // DB から全削除
        fetch('/api/user/progress', { method: 'DELETE' }).catch(() => {})
      },
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
