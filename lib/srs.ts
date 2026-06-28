/**
 * SRS（間隔反復）スケジューラ — 純粋関数（DB/IO なし、TDD対象）。
 *
 * 方針（deep-research で有効性確証済み）: 固定の拡張間隔 + 想起 + 誤答時の即リセット。
 * ease_factor は将来の SM-2 full 化に備えて温存（本実装では更新しない）。
 *
 * user_progress（既存テーブル）の repetitions / interval_days / next_review_date を
 * この関数の戻り値で upsert する。出題側は next_review_date <= today を due として優先する。
 */

export type Grade = 'good' | 'hard' | 'again'

export interface SrsState {
  repetitions: number
  interval_days: number
  ease_factor: number
}

export interface SrsUpdate extends SrsState {
  next_review_date: string // 'YYYY-MM-DD'
}

/** 拡張間隔（日）。index = repetitions に対応。末尾で頭打ち。 */
export const STEPS = [1, 3, 7, 16, 35, 70]

const MAX_REP = STEPS.length - 1

/** today の暦日（UTC）に days を加えて 'YYYY-MM-DD' を返す。時刻成分は無視（日単位）。 */
function addDays(today: Date, days: number): string {
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + days))
  return d.toISOString().slice(0, 10)
}

/**
 * 次回スケジュールを算出する。
 * - good : 昇格（rep+1, 上限 MAX_REP）し interval=STEPS[rep']
 * - hard : 据え置き（rep据え置き）し interval=同段の0.6倍（最低1日）で短め再提示
 * - again: リセット（rep=0, interval=1）で翌日に再出題（訂正フィードバック後の即復習）
 * ease_factor は常に据え置き。
 */
export function nextReview(prev: SrsState, grade: Grade, today: Date): SrsUpdate {
  const curRep = Math.min(Math.max(prev.repetitions ?? 0, 0), MAX_REP)

  let repetitions: number
  let interval_days: number

  if (grade === 'good') {
    repetitions = Math.min(curRep + 1, MAX_REP)
    interval_days = STEPS[repetitions]
  } else if (grade === 'hard') {
    repetitions = curRep
    interval_days = Math.max(1, Math.round(STEPS[curRep] * 0.6))
  } else {
    // again
    repetitions = 0
    interval_days = 1
  }

  return {
    repetitions,
    interval_days,
    ease_factor: prev.ease_factor ?? 2.5,
    next_review_date: addDays(today, interval_days),
  }
}

/**
 * 採点結果（status）と反応速度から grade を導出する。
 * - good : correct かつ即答(<3500ms)
 * - hard : correct だが遅い(>=3500ms)、または partial
 * - again: incorrect（Skip/「分かりません」含む）
 * - status 欠落時は isCorrect で good/again にフォールバック（速度情報がないため good 既定）
 */
export function deriveGrade(
  status: 'correct' | 'partial' | 'incorrect' | null | undefined,
  responseTimeMs: number | null | undefined,
  isCorrect: boolean,
): Grade {
  if (status === 'correct') {
    return responseTimeMs != null && responseTimeMs < 3500 ? 'good' : 'hard'
  }
  if (status === 'partial') return 'hard'
  if (status === 'incorrect') return 'again'
  return isCorrect ? 'good' : 'again'
}

/** 習熟判定: 末尾段(rep>=MAX_REP)かつ十分な間隔(>=35日)に到達したら習熟扱い。 */
export function isMastered(state: Pick<SrsState, 'repetitions' | 'interval_days'>): boolean {
  return state.repetitions >= MAX_REP && state.interval_days >= 35
}
