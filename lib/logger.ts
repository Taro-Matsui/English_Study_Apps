import { getSupabase } from '@/lib/supabase'

type LogLevel = 'error' | 'warn' | 'info'

interface LogEntry {
  level: LogLevel
  endpoint: string
  message: string
  detail?: Record<string, unknown>
}

/**
 * 最小限のサーバーサイドロガー (A09: Logging and Monitoring)
 *
 * - 常に console に出力（Railway ログに残る）
 * - Supabase app_logs テーブルにも非同期で永続化
 *   失敗しても例外は投げない（ロギング自体がアプリを止めないよう fire-and-forget）
 */
export function log(entry: LogEntry): void {
  const ts = new Date().toISOString()
  const structured = { ts, ...entry }

  // 1. コンソール出力（Railway が自動収集）
  if (entry.level === 'error') {
    console.error(JSON.stringify(structured))
  } else if (entry.level === 'warn') {
    console.warn(JSON.stringify(structured))
  } else {
    console.log(JSON.stringify(structured))
  }

  // 2. Supabase への非同期永続化（fire-and-forget）
  try {
    const db = getSupabase()
    db.from('app_logs').insert({
      level: entry.level,
      endpoint: entry.endpoint,
      message: entry.message,
      detail: entry.detail ?? null,
    }).then(({ error }) => {
      if (error) console.error('[logger] Supabase insert failed:', error.message)
    })
  } catch {
    // ロガー自体のエラーはサイレントに無視
  }
}
