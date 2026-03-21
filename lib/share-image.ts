export interface ShareParams {
  pct: number
  correct: number
  total: number
  partial: number
  incorrect: number
  theme?: 'light' | 'dark'
  studyPurpose?: string
}

const PURPOSE_SHARE_LABELS: Record<string, string> = {
  meeting:   'ミーティング英語',
  review:    'コードレビュー英語',
  reading:   '技術文書英語',
  interview: '面接英語',
  general:   'ビジネス英語',
}

/** X 投稿用テキストを生成 */
export function getShareText({ pct, correct, total, studyPurpose }: ShareParams): string {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const categoryTag = studyPurpose && PURPOSE_SHARE_LABELS[studyPurpose]
    ? ` #${PURPOSE_SHARE_LABELS[studyPurpose].replace(/\s/g, '')}` : ''
  return [
    `【Reel】クイズ完了 📊`,
    `${pct}% 正解（${correct}/${total}問）`,
    ``,
    `Reel — 実際の会話から学ぶ英語フレーズ`,
    appUrl,
    ``,
    `#英語学習 #フレーズ学習${categoryTag}`,
  ].join('\n')
}

/** 角丸矩形を ctx.fillStyle で塗りつぶす */
function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}

/**
 * クイズ結果のシェア画像を Canvas で生成し Blob を返す。
 * 1200×630px（Twitter カード推奨サイズ）。
 */
export async function generateQuizResultImage(params: ShareParams): Promise<Blob> {
  const { pct, correct, total, partial, incorrect, theme = 'dark' } = params
  const isLight = theme === 'light'
  const W = 1200, H = 630
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  const scoreColor =
    pct >= 80 ? '#10b981' :   // emerald-500
    pct >= 60 ? '#f59e0b' :   // amber-500
               '#ef4444'      // red-500

  const motivationText =
    pct >= 80 ? '素晴らしい！この調子で明日も 🔥' :
    pct >= 60 ? 'いい調子！また明日も挑戦 💡' :
               '挑戦を続けることが上達の近道 ✨'

  // ── 背景グラデーション ─────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H)
  if (isLight) {
    bg.addColorStop(0, '#f8fafc')   // slate-50
    bg.addColorStop(1, '#eef2ff')   // indigo-50
  } else {
    bg.addColorStop(0, '#0f172a')   // slate-900
    bg.addColorStop(1, '#1e1b4b')   // indigo-950
  }
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // デコレーション円（右上・スコアカラー）
  ctx.fillStyle = `${scoreColor}${isLight ? '22' : '1a'}`
  ctx.beginPath(); ctx.arc(W + 80, -80, 400, 0, Math.PI * 2); ctx.fill()
  // デコレーション円（左下・indigo）
  ctx.fillStyle = isLight ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.10)'
  ctx.beginPath(); ctx.arc(-80, H + 80, 340, 0, Math.PI * 2); ctx.fill()

  // ── ヘッダー ───────────────────────────────────────────
  // 左アクセントバー
  ctx.fillStyle = '#6366f1'
  fillRoundRect(ctx, 60, 52, 5, 42, 3)

  // アプリ名
  ctx.fillStyle = isLight ? '#1e293b' : '#f1f5f9'
  ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('Reel', 78, 81)

  // サブタイトル
  ctx.fillStyle = '#64748b'
  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText('Reel in the words.', 78, 107)

  // 日付（右寄せ）
  const dateStr = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  ctx.fillStyle = isLight ? '#94a3b8' : '#475569'
  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(dateStr, W - 60, 81)

  // 区切り線
  ctx.strokeStyle = isLight ? '#e2e8f0' : '#1e293b'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(60, 138); ctx.lineTo(W - 60, 138); ctx.stroke()

  // ── メインスコア ──────────────────────────────────────
  // モチベーションメッセージ
  ctx.fillStyle = isLight ? '#64748b' : '#94a3b8'
  ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(motivationText, W / 2, 192)

  // スコア % （大）
  ctx.fillStyle = scoreColor
  ctx.font = 'bold 196px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${pct}%`, W / 2, 400)

  // 問題数サマリ
  ctx.fillStyle = isLight ? '#64748b' : '#94a3b8'
  ctx.font = '30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText(`${correct} / ${total} 問正解`, W / 2, 453)

  // ── 内訳バッジ ────────────────────────────────────────
  const bW = 192, bH = 58, bGap = 14
  const bTotalW = bW * 3 + bGap * 2
  const bX0 = (W - bTotalW) / 2
  const bY = 490

  const badges = [
    { label: `✓  正解 ${correct}`, bg: isLight ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.18)', fg: '#10b981' },
    { label: `△  部分 ${partial}`,  bg: isLight ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.18)', fg: '#f59e0b' },
    { label: `✗  誤答 ${incorrect}`, bg: isLight ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.18)',  fg: '#ef4444' },
  ]
  badges.forEach(({ label, bg, fg }, i) => {
    const bx = bX0 + i * (bW + bGap)
    ctx.fillStyle = bg
    fillRoundRect(ctx, bx, bY, bW, bH, 12)
    ctx.fillStyle = fg
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(label, bx + bW / 2, bY + 38)
  })

  // ── フッター ──────────────────────────────────────────
  const footerY = H - 34

  // ハッシュタグ（左）
  ctx.fillStyle = isLight ? '#94a3b8' : '#334155'
  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('#英語学習  #フレーズ学習', 60, footerY)

  // URL（右）
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  ctx.fillStyle = '#6366f1'
  ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(appUrl, W - 60, footerY)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob failed'))),
      'image/png',
    )
  })
}

/**
 * 結果画像をクリップボードにコピーし X 投稿画面を開く。
 * クリップボードへのコピー成功時は true を返す。
 * コピー後に X ウィンドウを開くので、ユーザーは Ctrl+V で画像を貼り付けられる。
 */
export async function openXShare(params: ShareParams): Promise<boolean> {
  const shareText = getShareText(params)
  let copied = false
  try {
    const blob = await generateQuizResultImage(params)
    if (navigator.clipboard && 'ClipboardItem' in window) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      copied = true
    }
  } catch {}
  // コピー成功時は少し間を置いてから X を開く（ユーザーがトーストを読む時間）
  const delay = copied ? 600 : 0
  setTimeout(() => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }, delay)
  return copied
}
