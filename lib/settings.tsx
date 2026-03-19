'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface Settings {
  voiceURI: string | null   // null = ブラウザ既定
  skipMastered: boolean     // 正解済みをスキップするか
  masteredIds: string[]     // 一度でも正解したphrase_id一覧
}

interface SettingsContextType {
  settings: Settings
  setVoice: (uri: string | null) => void
  setSkipMastered: (v: boolean) => void
  markMastered: (phraseId: string) => void
  clearMastered: () => void
}

const DEFAULT: Settings = { voiceURI: null, skipMastered: false, masteredIds: [] }
const KEY = 'app_settings'

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT,
  setVoice: () => {},
  setSkipMastered: () => {},
  markMastered: () => {},
  clearMastered: () => {},
})

function persist(s: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {}
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
      setVoice: (uri) => update((p) => ({ ...p, voiceURI: uri })),
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
