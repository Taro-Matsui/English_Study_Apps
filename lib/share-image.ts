export interface ShareParams {
  pct: number
  correct: number
  total: number
  partial: number
  incorrect: number
  studyPurpose?: string
  sessionId?: string
}

const PURPOSE_SHARE_LABELS: Record<string, string> = {
  meeting:   'ミーティング英語',
  review:    'コードレビュー英語',
  reading:   '技術文書英語',
  interview: '面接英語',
  general:   'ビジネス英語',
}

/** X 投稿用テキストを生成（URL は別途 &url= で渡すため本文に含めない） */
export function getShareText({ pct, correct, total, studyPurpose }: ShareParams): string {
  const categoryTag = studyPurpose && PURPOSE_SHARE_LABELS[studyPurpose]
    ? ` #${PURPOSE_SHARE_LABELS[studyPurpose].replace(/\s/g, '')}` : ''
  return [
    `【Reel】クイズ完了 📊`,
    `${pct}% 正解（${correct}/${total}問）`,
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
 * クイズ結果シェア画像を Canvas で生成し Blob を返す。
 * 縦長 630×900px、ウォームベージュテーマ。
 */
export async function generateQuizResultImage(params: ShareParams): Promise<Blob> {
  const { pct, correct, total, partial, incorrect, studyPurpose } = params
  const W = 630, H = 900
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  const scoreColor =
    pct >= 80 ? '#10b981' :  // emerald
    pct >= 60 ? '#d97706' :  // amber
               '#ef4444'     // red

  const motivationText =
    pct >= 80 ? '素晴らしい！この調子で 🔥' :
    pct >= 60 ? 'いい調子！また明日も 💡' :
               '続けることが上達の近道 ✨'

  // ── 背景（ウォームベージュグラデーション）────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#f5f0e8')
  bg.addColorStop(1, '#e8ddd0')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // デコレーション：右上のソフト円
  ctx.fillStyle = `${scoreColor}18`
  ctx.beginPath(); ctx.arc(W + 60, -60, 300, 0, Math.PI * 2); ctx.fill()
  // 左下の円
  ctx.fillStyle = 'rgba(139,99,64,0.08)'
  ctx.beginPath(); ctx.arc(-60, H + 60, 280, 0, Math.PI * 2); ctx.fill()

  const font = (size: number, weight: string = 'normal') =>
    `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`

  // ── アプリ名ヘッダー ──────────────────────────────────────────
  const HEADER_Y = 80

  // 🎣 アイコン
  ctx.font = font(52)
  ctx.textAlign = 'center'
  ctx.fillText('🎣', W / 2, HEADER_Y)

  // Reel
  ctx.fillStyle = '#4a3020'
  ctx.font = font(48, 'bold')
  ctx.textAlign = 'center'
  ctx.fillText('Reel', W / 2, HEADER_Y + 60)

  // タグライン
  ctx.fillStyle = '#8b6340'
  ctx.font = font(20)
  ctx.textAlign = 'center'
  ctx.fillText('実際の会話から学ぶ英語フレーズ', W / 2, HEADER_Y + 96)

  // ── 区切り線 ──────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(139,115,85,0.25)'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(60, HEADER_Y + 120); ctx.lineTo(W - 60, HEADER_Y + 120); ctx.stroke()

  // ── スコアカード ──────────────────────────────────────────────
  const CARD_Y = HEADER_Y + 150
  const CARD_H = 280
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  fillRoundRect(ctx, 40, CARD_Y, W - 80, CARD_H, 24)

  // モチベーションテキスト
  ctx.fillStyle = '#7a6248'
  ctx.font = font(20)
  ctx.textAlign = 'center'
  ctx.fillText(motivationText, W / 2, CARD_Y + 46)

  // スコア % （メイン数字）
  ctx.fillStyle = scoreColor
  ctx.font = font(110, 'bold')
  ctx.textAlign = 'center'
  ctx.fillText(`${pct}%`, W / 2, CARD_Y + 175)

  // 問題数
  ctx.fillStyle = '#7a6248'
  ctx.font = font(26)
  ctx.textAlign = 'center'
  ctx.fillText(`${correct} / ${total} 問正解`, W / 2, CARD_Y + 225)

  // ── 内訳バッジ（3列）────────────────────────────────────────
  const BADGE_Y = CARD_Y + CARD_H + 32
  const bW = 162, bH = 72, bGap = 12
  const bTotalW = bW * 3 + bGap * 2
  const bX0 = (W - bTotalW) / 2

  const badges = [
    { label: '正解', value: correct, bg: 'rgba(16,185,129,0.12)', fg: '#10b981' },
    { label: '部分', value: partial,  bg: 'rgba(217,119,6,0.12)',  fg: '#d97706' },
    { label: '誤答', value: incorrect, bg: 'rgba(239,68,68,0.12)', fg: '#ef4444' },
  ]
  badges.forEach(({ label, value, bg, fg }, i) => {
    const bx = bX0 + i * (bW + bGap)
    ctx.fillStyle = bg
    fillRoundRect(ctx, bx, BADGE_Y, bW, bH, 16)
    // count
    ctx.fillStyle = fg
    ctx.font = font(34, 'bold')
    ctx.textAlign = 'center'
    ctx.fillText(String(value), bx + bW / 2, BADGE_Y + 42)
    // label
    ctx.fillStyle = '#7a6248'
    ctx.font = font(16)
    ctx.fillText(label, bx + bW / 2, BADGE_Y + 62)
  })

  // ── 日付 ─────────────────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  ctx.fillStyle = '#a08060'
  ctx.font = font(20)
  ctx.textAlign = 'center'
  ctx.fillText(dateStr, W / 2, BADGE_Y + bH + 52)

  // ── ハッシュタグ ──────────────────────────────────────────────
  const categoryTag = studyPurpose && PURPOSE_SHARE_LABELS[studyPurpose]
    ? ` #${PURPOSE_SHARE_LABELS[studyPurpose].replace(/\s/g, '')}` : ''
  const tags = `#英語学習  #フレーズ学習${categoryTag}`
  ctx.fillStyle = 'rgba(139,99,64,0.5)'
  ctx.font = font(19)
  ctx.textAlign = 'center'
  ctx.fillText(tags, W / 2, BADGE_Y + bH + 86)

  // ── URL フッター ──────────────────────────────────────────────
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  ctx.fillStyle = '#8b6340'
  ctx.font = font(18)
  ctx.textAlign = 'center'
  ctx.fillText(appUrl, W / 2, H - 36)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob failed'))),
      'image/png',
    )
  })
}

/**
 * Supabase Storage の share-images バケットに画像をアップロードする。
 * 認証済みユーザーのみ書き込み可、バケットはパブリック読み取り。
 * アップロード成功時は公開 URL を返す。失敗時は null を返す。
 */
export async function uploadShareImage(blob: Blob, sessionId: string): Promise<string | null> {
  try {
    const { createBrowserSupabaseClient } = await import('@/lib/supabase-browser')
    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.storage
      .from('share-images')
      .upload(`${sessionId}.png`, blob, { contentType: 'image/png', upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('share-images').getPublicUrl(`${sessionId}.png`)
    return data.publicUrl
  } catch {
    return null
  }
}

/**
 * 結果をシェア。
 * sessionId あり → Canvas 画像を Storage にアップロード後、Twitter Cards URL ツイート
 * sessionId なし（モバイル）→ Web Share API でファイルシェア
 * sessionId なし（デスクトップ）→ クリップボードコピー + X 投稿画面を開く
 *
 * 戻り値: 'shared' | 'copied' | 'opened'
 */
export async function openXShare(params: ShareParams): Promise<'shared' | 'copied' | 'opened'> {
  const { sessionId } = params
  const shareText = getShareText(params)

  // ── Twitter Cards: sessionId がある場合 ──────────────────────
  // 画像を Storage にアップロード → Twitter がog:imageを自動取得してカード表示
  if (sessionId && typeof window !== 'undefined') {
    const blob = await generateQuizResultImage(params).catch(() => null)
    if (blob) {
      // アップロードは投稿前に完了させる（Twitter クローラーが即時取得できるように）
      await uploadShareImage(blob, sessionId)
    }
    const shareUrl = `${window.location.origin}/share/${sessionId}`
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'noopener,noreferrer',
    )
    return 'opened'
  }

  // ── フォールバック: Canvas 画像生成 ──────────────────────────
  const blob = await generateQuizResultImage(params).catch(() => null)

  // モバイル: Web Share API でファイルシェア
  if (blob && typeof navigator.share === 'function' && navigator.canShare) {
    const file = new File([blob], 'reel-result.png', { type: 'image/png' })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          text: shareText,
        })
        return 'shared'
      } catch {
        // キャンセルや権限拒否 → フォールバック
      }
    }
  }

  // デスクトップ: クリップボード + X ウィンドウ
  let copied = false
  if (blob && navigator.clipboard && 'ClipboardItem' in window) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      copied = true
    } catch {}
  }

  const fallbackText = typeof window !== 'undefined'
    ? `${shareText}\n\n${window.location.origin}`
    : shareText

  const delay = copied ? 600 : 0
  setTimeout(() => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(fallbackText)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }, delay)

  return copied ? 'copied' : 'opened'
}
