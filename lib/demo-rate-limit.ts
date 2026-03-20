/**
 * インメモリ IP ベースレート制限（デモ用）
 * プロセスメモリを使用するため Railway 再起動でリセットされる。
 * 本番の認証済みレート制限は lib/rate-limit.ts (DB 永続) を使用。
 */
const store = new Map<string, { count: number; window: string }>()

export function checkDemoRateLimit(ip: string, endpoint: string, limit: number): boolean {
  // 1時間ウィンドウ: YYYYMMDDHH
  const window = new Date().toISOString().slice(0, 13).replace(/[-T:]/g, '')
  const key = `${ip}:${endpoint}:${window}`
  const entry = store.get(key) ?? { count: 0, window }
  if (entry.count >= limit) return true  // rate limited
  store.set(key, { count: entry.count + 1, window })
  return false
}

/** リクエストから IP アドレスを取得（Railway は x-forwarded-for を設定する） */
export function getClientIp(req: Request): string {
  const xff = req instanceof Request
    ? req.headers.get('x-forwarded-for')
    : null
  return xff?.split(',')[0]?.trim() ?? 'unknown'
}
