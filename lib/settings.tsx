'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type VoicePreset = 'default' | 'us-female' | 'us-male' | 'indian' | 'custom'

interface Settings {
  voicePreset: VoicePreset  // 音声プリセット
  voiceURI: string | null   // voicePreset === 'custom' のときのみ使用
  skipMastered: boolean
  masteredIds: string[]
}

interface SettingsContextType {
  settings: Settings
  setVoicePreset: (preset: VoicePreset) => void
  setVoice: (uri: string | null) => void
  setSkipMastered: (v: boolean) => void
  markMastered: (phraseId: string) => void
  clearMastered: () => void
}

const DEFAULT: Settings = {
  voicePreset: 'default',
  voiceURI: null,
  skipMastered: false,
  masteredIds: [],
}
const KEY = 'app_settings'

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT,
  setVoicePreset: () => {},
  setVoice: () => {},
  setSkipMastered: () => {},
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
    try {
      const saved = localStorage.getItem(KEY)
      if (saved) setSettings({ ...DEFAULT, ...JSON.parse(saved) })
    } catch {}
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
      markMastered: (id) => update((p) => ({
        ...p,
        masteredIds: p.masteredIds.includes(id) ? p.masteredIds : [...p.masteredIds, id],
      })),
      clearMastered: () => update((p) => ({ ...p, masteredIds: [] })),
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
