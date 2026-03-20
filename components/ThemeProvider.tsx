'use client'

import { useEffect } from 'react'
import { useSettings } from '@/lib/settings'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings()

  useEffect(() => {
    const root = document.documentElement
    const theme = settings.colorTheme ?? 'light'
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    } else {
      root.classList.remove('dark')
    }
  }, [settings.colorTheme])

  return <>{children}</>
}
