import { getSupabaseAdmin } from './supabase'

/**
 * DB ベースのアトミックなレート制限チェック（1時間ウィンドウ）
 * Postgres RPC `check_and_increment_rate_limit` でカウントを原子的にインクリメント
 * @returns true = 制限超過（呼び出し元は 429 を返すべき）
 */
export async function isRateLimited(userId: string, endpoint: string, limitPerHour: number): Promise<boolean> {
  try {
    const db = getSupabaseAdmin()
    const now = new Date()
    // 時間ウィンドウキー (YYYYMMDDHH UTC)
    const windowKey = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}${String(now.getUTCHours()).padStart(2, '0')}`

    const { data, error } = await db.rpc('check_and_increment_rate_limit', {
      p_user_id:    userId,
      p_endpoint:   endpoint,
      p_window_key: windowKey,
      p_limit:      limitPerHour,
    })

    if (error) {
      // DB エラー時はレート制限を適用しない（サービス継続優先）
      console.error('[rate-limit] rpc error:', error.message)
      return false
    }

    return data === true
  } catch {
    return false
  }
}
