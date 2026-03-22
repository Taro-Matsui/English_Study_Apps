'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createBrowserSupabaseClient } from '@/lib/supabase-browser'
import type { ProficiencyQuestion } from '@/app/api/proficiency/route'

type StudyPurpose = 'business_general' | 'business_engineer' | 'hobby_lifestyle' | 'hobby_reading'
type StudySubcategory = 'meeting' | 'review' | 'conference'
type StudyLevel = 'beginner' | 'intermediate' | 'advanced'
type Step = 'survey' | 'loading' | 'proficiency' | 'domain_message' | 'results'

const DOMAIN_PRESETS = [
  'データエンジニア',
  'データサイエンティスト',
  'フロントエンド開発',
  'バックエンド開発',
  'セキュリティ',
  'ワイン・グルメ',
  '旅行・観光',
  '映画・小説',
  'ビジネス・マーケティング',
]

const PURPOSES: { value: StudyPurpose; icon: string; label: string; desc: string }[] = [
  { value: 'business_general',  icon: '🏢', label: 'ビジネス：一般',             desc: '職場・会議・メール・プレゼンなど仕事全般' },
  { value: 'business_engineer', icon: '💻', label: 'ビジネス：エンジニア',       desc: 'エンジニアの職場・技術コミュニケーション' },
  { value: 'hobby_lifestyle',   icon: '🌏', label: '趣味：旅行・ライフスタイル', desc: '旅行・グルメ・ワイン・スポーツなど' },
  { value: 'hobby_reading',     icon: '📖', label: '趣味：小説・読書',           desc: '英語小説・エッセイ・読書を楽しみたい' },
]

const SUBCATEGORIES: { value: StudySubcategory; icon: string; label: string; desc: string }[] = [
  { value: 'meeting',    icon: '💬', label: 'ミーティング・日常会話',             desc: 'チームとのやり取り・スタンドアップ・Slack' },
  { value: 'review',     icon: '👨‍💻', label: 'コードレビュー・技術ドキュメント', desc: 'レビューコメント・技術文書・専門用語' },
  { value: 'conference', icon: '🎤', label: '採用面接・プレゼン・カンファレンス', desc: 'フォーマルな発表・カンファ登壇・採用面接' },
]

const LEVELS: { value: StudyLevel; label: string; desc: string }[] = [
  { value: 'beginner',     label: '初級', desc: '英語をほぼ使ったことがない' },
  { value: 'intermediate', label: '中級', desc: '読めるが会話・作文が難しい' },
  { value: 'advanced',     label: '上級', desc: 'ビジネス英語を洗練させたい' },
]

// 旧 purpose 値を新しい体系にマッピング（編集モードの後方互換）
function migrateOldPurpose(old: string): { purpose: StudyPurpose; subcategory?: StudySubcategory } {
  switch (old) {
    case 'meeting':   return { purpose: 'business_engineer', subcategory: 'meeting' }
    case 'review':    return { purpose: 'business_engineer', subcategory: 'review' }
    case 'reading':   return { purpose: 'business_engineer', subcategory: 'review' }
    case 'interview': return { purpose: 'business_engineer', subcategory: 'conference' }
    case 'general':   return { purpose: 'business_engineer', subcategory: 'meeting' }
    default:          return { purpose: 'business_general' }
  }
}

// proficiency API に渡すための purpose マッピング（既存の問題セットに合わせる）
function getProficiencyPurpose(purpose: StudyPurpose, subcategory: StudySubcategory | null): string {
  if (purpose === 'business_engineer') {
    if (subcategory === 'meeting') return 'meeting'
    if (subcategory === 'review') return 'review'
    if (subcategory === 'conference') return 'interview'
  }
  if (purpose === 'hobby_reading') return 'reading'
  return 'general'
}

// ── ウォームベージュ パレット ─────────────────────────────────
const C = {
  bg:      'linear-gradient(160deg, #f5f0e8 0%, #e8ddd0 100%)',
  text:    '#4a3020',
  sub:     '#7a6248',
  muted:   '#a08060',
  accent:  '#8b6340',
  cardBg:  'rgba(255,255,255,0.75)',
  border:  'rgba(139,115,85,0.2)',
  selBg:   'rgba(139,99,64,0.10)',
  selBdr:  '#8b6340',
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()

  // ── 共通 state ──────────────────────────────────────────────
  const [step, setStep] = useState<Step>('survey')
  const [purpose, setPurpose] = useState<StudyPurpose | null>(null)
  const [subcategory, setSubcategory] = useState<StudySubcategory | null>(null)
  const [level, setLevel] = useState<StudyLevel | null>(null)
  const [domain, setDomain] = useState('')
  const [error, setError] = useState<string | null>(null)

  // ── 英語力チェック state ─────────────────────────────────────
  const [questions, setQuestions] = useState<ProficiencyQuestion[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [saving, setSaving] = useState(false)

  const isEdit = !!user?.user_metadata?.onboarding_complete

  // 編集モード: 既存の設定を初期値として使う（旧フォーマットも変換）
  useEffect(() => {
    if (!user) return
    const p = user.user_metadata?.study_purpose as string | undefined
    const sub = user.user_metadata?.study_subcategory as StudySubcategory | undefined
    const l = user.user_metadata?.study_level as StudyLevel | undefined
    const d = user.user_metadata?.study_domain as string | undefined

    if (p) {
      if (PURPOSES.some((x) => x.value === p)) {
        // 新フォーマット
        setPurpose(p as StudyPurpose)
        if (sub && SUBCATEGORIES.some((x) => x.value === sub)) setSubcategory(sub)
      } else {
        // 旧フォーマット → 変換
        const migrated = migrateOldPurpose(p)
        setPurpose(migrated.purpose)
        if (migrated.subcategory) setSubcategory(migrated.subcategory)
      }
    }
    if (l && LEVELS.some((x) => x.value === l)) setLevel(l)
    if (d) setDomain(d)
  }, [user])

  // purpose が変わったときにサブカテゴリをリセット
  function handlePurposeSelect(p: StudyPurpose) {
    setPurpose(p)
    if (p !== 'business_engineer') setSubcategory(null)
  }

  // 次に進める条件
  const canProceed = !!purpose && !!level && (purpose !== 'business_engineer' || !!subcategory)

  // ── 英語力チェック問題を取得して開始 ────────────────────────
  async function fetchAndStartProficiency() {
    setStep('loading')
    try {
      const profPurpose = getProficiencyPurpose(purpose!, subcategory)
      const res = await fetch(`/api/proficiency?purpose=${profPurpose}`)
      const data = await res.json() as { questions: ProficiencyQuestion[] }
      setQuestions(data.questions)
      setStep('proficiency')
    } catch {
      await saveAndRedirect()
    }
  }

  // ── Step 1 → 2: アンケート完了、英語力チェックへ ────────────
  async function handleSurveyNext() {
    if (!canProceed) return

    if (isEdit) {
      await saveAndRedirect()
      return
    }

    // 専門領域・趣味が設定されている場合は汎用チェックをスキップ
    if (domain.trim()) {
      setStep('domain_message')
      return
    }

    await fetchAndStartProficiency()
  }

  // ── プロフィシェンシー: 選択肢タップ ────────────────────────
  function handleSelect(idx: number) {
    if (showAnswer) return
    setSelectedOption(idx)
    setShowAnswer(true)
  }

  // ── プロフィシェンシー: 分かりません ─────────────────────────
  function handleDontKnow() {
    if (showAnswer) return
    setSelectedOption(-1)
    setShowAnswer(true)
  }

  // ── プロフィシェンシー: 次の問題へ ──────────────────────────
  function handleNextQuestion() {
    const nextAnswers = [...answers, selectedOption ?? -1]
    if (currentQ + 1 >= questions.length) {
      setAnswers(nextAnswers)
      setStep('results')
    } else {
      setAnswers(nextAnswers)
      setCurrentQ((q) => q + 1)
      setSelectedOption(null)
      setShowAnswer(false)
    }
  }

  // ── Step 3: API保存 → リダイレクト ──────────────────────────
  async function saveAndRedirect() {
    if (!purpose || !level) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          study_purpose:     purpose,
          study_subcategory: purpose === 'business_engineer' ? subcategory : undefined,
          study_level:       level,
          study_domain:      domain.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? '設定の保存に失敗しました')
        setSaving(false)
        return
      }
      // JWT を更新してから遷移（admin.updateUserById 後のメタデータを反映するため）
      const supabase = createBrowserSupabaseClient()
      await supabase.auth.refreshSession()
      router.push(isEdit ? '/settings' : '/')
      router.refresh()
    } catch {
      setError('ネットワークエラーが発生しました')
      setSaving(false)
    }
  }

  // 正解数
  const correctCount = answers.filter((a, i) => a === questions[i]?.correct).length

  // ── ベースレイアウト ─────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.bg }}>

      {/* ── Step 1: アンケート ────────────────────────────────── */}
      {step === 'survey' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-lg space-y-7">

            {/* ヘッダー */}
            <div className="text-center space-y-1">
              {isEdit ? (
                <>
                  <p className="text-3xl">⚙️</p>
                  <h1 className="text-xl font-bold" style={{ color: C.text }}>学習設定を変更</h1>
                  <p className="text-sm" style={{ color: C.sub }}>設定はフレーズ抽出のプロンプトに反映されます。</p>
                </>
              ) : (
                <>
                  <p className="text-4xl">🎣</p>
                  <h1 className="text-xl font-bold" style={{ color: C.text }}>Reel へようこそ</h1>
                  <p className="text-sm" style={{ color: C.sub }}>あなたの学習スタイルを教えてください。</p>
                </>
              )}
            </div>

            {/* 英語を使う主な目的 */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                英語を使う主な目的は？
              </h2>
              <div className="space-y-2">
                {PURPOSES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handlePurposeSelect(p.value)}
                    className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all"
                    style={{
                      background: purpose === p.value ? C.selBg : C.cardBg,
                      borderColor: purpose === p.value ? C.selBdr : C.border,
                    }}
                  >
                    <span className="text-xl flex-shrink-0 mt-0.5">{p.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: purpose === p.value ? C.accent : C.text }}>
                        {p.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: C.muted }}>{p.desc}</p>
                    </div>
                    {purpose === p.value && (
                      <span className="flex-shrink-0 font-bold" style={{ color: C.accent }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* エンジニアのサブカテゴリ（business_engineer 選択時のみ表示） */}
            {purpose === 'business_engineer' && (
              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                  主に使う場面は？
                </h2>
                <div className="space-y-2">
                  {SUBCATEGORIES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSubcategory(s.value)}
                      className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all"
                      style={{
                        background: subcategory === s.value ? C.selBg : C.cardBg,
                        borderColor: subcategory === s.value ? C.selBdr : C.border,
                      }}
                    >
                      <span className="text-xl flex-shrink-0 mt-0.5">{s.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: subcategory === s.value ? C.accent : C.text }}>
                          {s.label}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: C.muted }}>{s.desc}</p>
                      </div>
                      {subcategory === s.value && (
                        <span className="flex-shrink-0 font-bold" style={{ color: C.accent }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 英語レベル */}
            <div className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                現在の英語レベルは？
              </h2>
              <div className="flex gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => setLevel(l.value)}
                    className="flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-center transition-all"
                    style={{
                      background: level === l.value ? C.selBg : C.cardBg,
                      borderColor: level === l.value ? C.selBdr : C.border,
                    }}
                  >
                    <span className="text-sm font-bold" style={{ color: level === l.value ? C.accent : C.text }}>
                      {l.label}
                    </span>
                    <span className="text-xs leading-tight" style={{ color: C.muted }}>{l.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 特に学びたい専門領域や興味・趣味（任意） */}
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>
                  特に学びたい専門領域や興味・趣味（任意）
                </h2>
                <span className="text-xs" style={{ color: C.muted }}>フレーズ抽出の優先度に反映</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {DOMAIN_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDomain((prev) => prev === preset ? '' : preset)}
                    className="text-xs px-3 py-1.5 rounded-full border transition-all"
                    style={{
                      background: domain === preset ? C.selBg : C.cardBg,
                      borderColor: domain === preset ? C.selBdr : C.border,
                      color: domain === preset ? C.accent : C.sub,
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value.slice(0, 100))}
                placeholder="または自由に入力（例: ワイン、機械学習、旅行英語）"
                style={{ fontSize: '16px', background: C.cardBg, borderColor: C.border, color: C.text }}
                className="w-full rounded-xl px-4 py-3 border placeholder:text-[#c0a888] focus:outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleSurveyNext}
              disabled={!canProceed}
              className="w-full py-4 rounded-2xl text-base font-bold shadow-md transition-opacity active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: C.accent, color: '#fff' }}
            >
              {isEdit ? '設定を更新する' : '英語力をチェックする →'}
            </button>

            {/* 新規ユーザー: スキップして直接保存 */}
            {!isEdit && canProceed && (
              <button
                onClick={saveAndRedirect}
                disabled={saving}
                className="w-full py-2 text-xs text-center transition-opacity disabled:opacity-50"
                style={{ color: C.muted }}
              >
                スキップしてすぐ始める
              </button>
            )}

            {isEdit && (
              <button
                onClick={() => router.back()}
                className="w-full py-2 text-sm"
                style={{ color: C.muted }}
              >
                キャンセル
              </button>
            )}

            {!isEdit && (
              <p className="text-center text-xs" style={{ color: C.muted }}>設定はあとから変更できます</p>
            )}
          </div>
        </div>
      )}

      {/* ── ローディング ──────────────────────────────────────── */}
      {step === 'loading' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-4xl animate-bounce">🎣</p>
            <p className="text-sm font-medium" style={{ color: C.sub }}>英語力チェックを準備中…</p>
          </div>
        </div>
      )}

      {/* ── ドメインメッセージ（専門領域が設定されている場合） ── */}
      {step === 'domain_message' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-lg space-y-6 text-center">
            <p className="text-5xl">🎣</p>
            <div>
              <h2 className="text-xl font-bold" style={{ color: C.text }}>
                あなた専用のフレーズをお届けします
              </h2>
              <p className="text-sm mt-2" style={{ color: C.sub }}>
                「<span className="font-semibold" style={{ color: C.accent }}>{domain}</span>」のコンテキストに合わせたフレーズを優先的に出題します。
                テキストをインポートすると、さらにあなただけの学習が始まります。
              </p>
            </div>
            <div
              className="p-4 rounded-2xl text-left space-y-2"
              style={{ background: C.cardBg, border: `1px solid ${C.border}` }}
            >
              <p className="text-xs font-semibold" style={{ color: C.muted }}>英語力チェックについて</p>
              <p className="text-sm" style={{ color: C.sub }}>
                汎用の英語力チェックは専門領域が決まっている場合には精度が下がるためスキップします。
                学習を進める中で自動的にレベルが調整されます。
              </p>
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}
            <button
              onClick={saveAndRedirect}
              disabled={saving}
              className="w-full py-4 rounded-2xl text-base font-bold shadow-md transition-opacity active:opacity-80 disabled:opacity-60"
              style={{ background: C.accent, color: '#fff' }}
            >
              {saving ? '設定を保存中...' : 'さあ始めよう！🎣'}
            </button>
            <button
              onClick={fetchAndStartProficiency}
              className="w-full py-2 text-xs"
              style={{ color: C.muted }}
              disabled={saving}
            >
              やっぱり英語力チェックを受ける
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: 英語力チェック ────────────────────────────── */}
      {step === 'proficiency' && questions.length > 0 && (
        <div className="flex-1 flex flex-col">

          {/* プログレスバー */}
          <div className="w-full h-1.5" style={{ background: 'rgba(139,99,64,0.15)' }}>
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${((currentQ + 1) / questions.length) * 100}%`,
                background: C.accent,
              }}
            />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-lg space-y-6">

              {/* ヘッダー */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium" style={{ color: C.muted }}>
                  英語力チェック
                </p>
                <p className="text-xs font-medium" style={{ color: C.muted }}>
                  {currentQ + 1} / {questions.length}
                </p>
              </div>

              {/* 問題文 */}
              <div
                className="p-5 rounded-2xl text-center"
                style={{ background: C.cardBg, border: `1px solid ${C.border}` }}
              >
                <p className="text-xs uppercase tracking-wider mb-3" style={{ color: C.muted }}>
                  この表現の意味は？
                </p>
                <p className="text-lg font-bold leading-snug" style={{ color: C.text }}>
                  {questions[currentQ].text}
                </p>
              </div>

              {/* 選択肢 */}
              <div className="space-y-2.5">
                {questions[currentQ].options.map((opt, idx) => {
                  const isCorrect = idx === questions[currentQ].correct
                  const isSelected = idx === selectedOption

                  let bg = C.cardBg
                  let borderColor = C.border
                  let textColor = C.text

                  if (showAnswer) {
                    if (isCorrect) {
                      bg = 'rgba(16,185,129,0.12)'
                      borderColor = '#10b981'
                      textColor = '#059669'
                    } else if (isSelected && !isCorrect) {
                      bg = 'rgba(239,68,68,0.08)'
                      borderColor = '#ef4444'
                      textColor = '#ef4444'
                    }
                  } else if (isSelected) {
                    bg = C.selBg
                    borderColor = C.selBdr
                    textColor = C.accent
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelect(idx)}
                      disabled={showAnswer}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all disabled:cursor-default"
                      style={{ background: bg, borderColor, color: textColor }}
                    >
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: borderColor, color: '#fff' }}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-sm font-medium flex-1">{opt}</span>
                      {showAnswer && isCorrect && <span className="text-lg flex-shrink-0">✓</span>}
                      {showAnswer && isSelected && !isCorrect && <span className="text-lg flex-shrink-0">✗</span>}
                    </button>
                  )
                })}

                {/* 分かりません */}
                {!showAnswer && (
                  <button
                    onClick={handleDontKnow}
                    className="w-full py-3 rounded-xl border text-sm transition-all"
                    style={{ background: 'rgba(139,99,64,0.05)', borderColor: C.border, color: C.muted }}
                  >
                    分かりません
                  </button>
                )}
              </div>

              {/* 次へボタン */}
              {showAnswer && (
                <button
                  onClick={handleNextQuestion}
                  className="w-full py-4 rounded-2xl text-base font-bold shadow-md transition-opacity active:opacity-80"
                  style={{ background: C.accent, color: '#fff' }}
                >
                  {currentQ + 1 >= questions.length ? '結果を見る →' : '次の問題 →'}
                </button>
              )}

              {/* スキップ */}
              {!showAnswer && (
                <button
                  onClick={saveAndRedirect}
                  disabled={saving}
                  className="w-full py-2 text-xs text-center transition-opacity disabled:opacity-50"
                  style={{ color: C.muted }}
                >
                  チェックをスキップして始める
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: 結果 ──────────────────────────────────────── */}
      {step === 'results' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-lg space-y-6 text-center">

            {/* スコア */}
            <div>
              <p className="text-6xl mb-3">
                {correctCount >= 8 ? '🎉' : correctCount >= 5 ? '👍' : '💡'}
              </p>
              <p className="text-4xl font-bold" style={{ color: C.accent }}>
                {correctCount} / {questions.length}
              </p>
              <p className="text-sm mt-1" style={{ color: C.sub }}>問正解</p>
            </div>

            {/* メッセージ */}
            <div
              className="p-4 rounded-2xl"
              style={{ background: C.cardBg, border: `1px solid ${C.border}` }}
            >
              <p className="text-sm font-medium" style={{ color: C.text }}>
                {correctCount >= 8
                  ? '素晴らしい！上級者向けフレーズも積極的に学んでいきましょう 🚀'
                  : correctCount >= 5
                  ? 'いい調子！実践的なフレーズで着実にレベルアップしていきましょう 📈'
                  : '基礎から丁寧に学んでいきましょう。Reel があなたをサポートします 🎣'}
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={saveAndRedirect}
              disabled={saving}
              className="w-full py-4 rounded-2xl text-base font-bold shadow-md transition-opacity active:opacity-80 disabled:opacity-60"
              style={{ background: C.accent, color: '#fff' }}
            >
              {saving ? '設定を保存中...' : 'さあ始めよう！🎣'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
