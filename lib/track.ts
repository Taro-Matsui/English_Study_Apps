// 登録前ファネル専用の薄い計装。GTM(GTM-PWNWXD23)が既に読む window.dataLayer に push するだけ。
// アプリ内フル計装（登録後の全節目）はしない — 登録後は Postgres タイムスタンプ + retention.sql の
// SQL 直読で追える（母数ゼロではダッシュボードは無意味）。ここは LP→demo→login の登録前 3 段だけ。
export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const w = window as unknown as { dataLayer?: unknown[] }
  w.dataLayer = w.dataLayer ?? []
  w.dataLayer.push({ event, ...(props ?? {}) })
}
