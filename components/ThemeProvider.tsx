'use client'

// テーマ切り替え機能を廃止。ウォームベージュで統一。
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
