export interface ShareParams {
  pct: number
  correct: number
  total: number
  partial: number
  incorrect: number
}

/** X 投稿用テキストを生成 */
export function getShareText({ pct, correct, total }: ShareParams): string {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  return [
    `【Engineer English】クイズ完了 📊`,
    `${pct}% 正解（${correct}/${total}問）`,
    ``,
    `エンジニア向け英語フレーズ学習アプリ`,
    appUrl,
    ``,
    `#エンジニア英語 #英語学習`,
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
  const { pct, correct, total, partial, incorrect } = params
  const W = 1200, H = 630
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  const scoreColor =
    pct >= 80 ? '#10b981' :   // emerald-500
    pct >= 60 ? '#f59e0b' :   // amber-500
               '#ef4444'      // red-500

  // ── 背景グラデーション ─────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0f172a')   // slate-900
  bg.addColorStop(1, '#1e1b4b')   // indigo-950
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // デコレーション円（右上・スコアカラー）
  ctx.fillStyle = `${scoreColor}1a`
  ctx.beginPath(); ctx.arc(W + 80, -80, 400, 0, Math.PI * 2); ctx.fill()
  // デコレーション円（左下・indigo）
  ctx.fillStyle = 'rgba(99,102,241,0.10)'
  ctx.beginPath(); ctx.arc(-80, H + 80, 340, 0, Math.PI * 2); ctx.fill()

  // ── ヘッダー ───────────────────────────────────────────
  // 左アクセントバー
  ctx.fillStyle = '#6366f1'
  fillRoundRect(ctx, 60, 52, 5, 42, 3)

  // アプリ名
  ctx.fillStyle = '#f1f5f9'
  ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('Engineer English', 78, 81)

  // サブタイトル
  ctx.fillStyle = '#64748b'
  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText('エンジニア向け英語フレーズ学習', 78, 107)

  // 日付（右寄せ）
  const dateStr = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  ctx.fillStyle = '#475569'
  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(dateStr, W - 60, 81)

  // 区切り線
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(60, 138); ctx.lineTo(W - 60, 138); ctx.stroke()

  // ── メインスコア ──────────────────────────────────────
  // 「今日のクイズ完了！」
  ctx.fillStyle = '#94a3b8'
  ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('今日のクイズ完了！', W / 2, 192)

  // スコア % （大）
  ctx.fillStyle = scoreColor
  ctx.font = 'bold 196px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`${pct}%`, W / 2, 400)

  // 問題数サマリ
  ctx.fillStyle = '#94a3b8'
  ctx.font = '30px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillText(`${correct} / ${total} 問正解`, W / 2, 453)

  // ── 内訳バッジ ────────────────────────────────────────
  const bW = 192, bH = 58, bGap = 14
  const bTotalW = bW * 3 + bGap * 2
  const bX0 = (W - bTotalW) / 2
  const bY = 490

  const badges = [
    { label: `✓  正解 ${correct}`, bg: 'rgba(16,185,129,0.18)', fg: '#10b981' },
    { label: `△  部分 ${partial}`,  bg: 'rgba(245,158,11,0.18)', fg: '#f59e0b' },
    { label: `✗  誤答 ${incorrect}`, bg: 'rgba(239,68,68,0.18)',  fg: '#ef4444' },
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
  ctx.fillStyle = '#334155'
  ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('#エンジニア英語  #英語学習', 60, footerY)

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
