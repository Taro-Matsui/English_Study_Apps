/**
 * AI モデル設定
 *
 * 各用途ごとに環境変数で独立して上書き可能。
 * 未設定時はすべて Sonnet（品質優先）。
 *
 * 商用プランでコスト分離する場合は Railway の環境変数で設定：
 *   AI_MODEL_JUDGE=claude-haiku-4-5-20251001
 *   AI_MODEL_DEMO_EXTRACT=claude-haiku-4-5-20251001
 *   など
 */
export const AI_MODELS = {
  /** フレーズ抽出（精度優先） */
  EXTRACT:      process.env.AI_MODEL_EXTRACT      ?? 'claude-sonnet-4-6',
  /** クイズ回答判定 */
  JUDGE:        process.env.AI_MODEL_JUDGE        ?? 'claude-sonnet-4-6',
  /** フレーズ解説生成 */
  EXPLAIN:      process.env.AI_MODEL_EXPLAIN      ?? 'claude-sonnet-4-6',
  /** デモ版フレーズ抽出（未認証ユーザー向け） */
  DEMO_EXTRACT: process.env.AI_MODEL_DEMO_EXTRACT ?? 'claude-sonnet-4-6',
  /** デモ版クイズ判定 */
  DEMO_JUDGE:   process.env.AI_MODEL_DEMO_JUDGE   ?? 'claude-sonnet-4-6',
} as const
