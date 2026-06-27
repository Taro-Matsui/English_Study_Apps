/**
 * クイズ採点の前段ローカル一致判定。
 *
 * 受容方向（英語フレーズ → 日本語意味当て）の回答について、Claude API を
 * 呼ばずに「正解」と確定できるケースを判定する。LLM スキップ率を上げて
 * 採点原価を下げるのが目的（Tier1 T1-1(A)）。
 *
 * 誤って不正解を「正解」にすると体験を壊すため、判定は保守的に設計する。
 *
 * ⚠️ 産出方向（日本語 → 英語綴り）では綴り厳密性が要るため、このスキップは
 * 使わないこと。現行クイズは受容方向のみ。
 */

/** 区切り文字（中黒・句読点・スラッシュ等）。要素分割に使う。 */
const DELIMITERS = /[・。、，,/／;；\n]/

/**
 * 回答文字列の正規化。
 * ① trim + 小文字化 ② 句読点・中黒・記号を除去 ③ 全角英数記号を半角化
 *
 * 既存 quiz/judge の normalize と同一の挙動を保つ（移植元: app/api/quiz/judge/route.ts）。
 */
export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[、。　！？!?,. ・]/g, '')
    .replace(/[　-〿！-｠]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
}

/**
 * ローカルで「正解」と確定できるか判定する。
 *
 * いずれかを満たせば true（= Claude をスキップして correct 返却）:
 * - R1: 正規化後の完全一致
 * - R2: 意味を区切り文字で分割した要素（正規化後2文字以上）のいずれかに完全一致
 * - R3: 正規化した回答（4文字以上）が正規化した意味文に連続部分として含まれる
 */
export function isLocalCorrect(userAnswer: string, meaningJa: string): boolean {
  const normUser = normalizeAnswer(userAnswer)
  if (!normUser) return false

  const normMeaning = normalizeAnswer(meaningJa)

  // R1: 完全一致
  if (normUser === normMeaning) return true

  // R2: 区切り要素の完全一致（正規化後2文字以上の要素のみ）
  const elements = meaningJa
    .split(DELIMITERS)
    .map((e) => normalizeAnswer(e))
    .filter((e) => e.length >= 2)
  if (elements.includes(normUser)) return true

  // R3: 4文字以上の実質的な部分包含
  if (normUser.length >= 4 && normMeaning.includes(normUser)) return true

  return false
}
