export interface ShareParams {
  pct: number
  correct: number
  total: number
  partial: number
  incorrect: number
  studyPurpose?: string
  studySubcategory?: string  // エンジニアのサブカテゴリ（より具体的なハッシュタグに使用）
  sessionId?: string
}

const PURPOSE_SHARE_LABELS: Record<string, string> = {
  // 新カテゴリ
  business_general:  'ビジネス英語',
  business_engineer: 'エンジニア英語',
  hobby_lifestyle:   '旅行英語',
  hobby_reading:     '読書英語',
  // エンジニア サブカテゴリ（より具体的）
  meeting:           'ミーティング英語',
  review:            'コードレビュー英語',
  conference:        'カンファレンス英語',
  // 後方互換
  reading:           '技術文書英語',
  interview:         '面接英語',
  general:           'ビジネス英語',
}

/** X 投稿用テキストを生成（URL は別途 &url= で渡すため本文に含めない） */
export function getShareText({ pct, correct, total, studyPurpose, studySubcategory }: ShareParams): string {
  // サブカテゴリ優先（より具体的なハッシュタグを使用）
  const effectivePurpose = studySubcategory ?? studyPurpose
  const categoryTag = effectivePurpose && PURPOSE_SHARE_LABELS[effectivePurpose]
    ? ` #${PURPOSE_SHARE_LABELS[effectivePurpose].replace(/\s/g, '')}` : ''
  return [
    `【Pick】チャレンジ完了 📊`,
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
 * 横長 1200×630px（Twitter summary_large_image 推奨サイズ）、ウォームベージュテーマ。
 * 左パネル: アプリ情報 / 右パネル: スコア
 */
export async function generateQuizResultImage(params: ShareParams): Promise<Blob> {
  const { pct, correct, total, partial, incorrect, studyPurpose, studySubcategory } = params
  const W = 1200, H = 630
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')!

  const scoreColor =
    pct >= 80 ? '#10b981' :
    pct >= 60 ? '#d97706' :
               '#ef4444'

  const motivationText =
    pct >= 80 ? '素晴らしい！この調子で 🔥' :
    pct >= 60 ? 'いい調子！また明日も 💡' :
               '続けることが上達の近道 ✨'

  // ── 背景 ──────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#f7f6f2')
  bg.addColorStop(1, '#eef1f0')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // デコレーション円（右上・左下）
  ctx.fillStyle = `${scoreColor}15`
  ctx.beginPath(); ctx.arc(W - 80, -80, 360, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = 'rgba(14,110,114,0.06)'
  ctx.beginPath(); ctx.arc(80, H + 80, 320, 0, Math.PI * 2); ctx.fill()

  const font = (size: number, weight = 'normal') =>
    `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`

  // ── 左パネル（ブランディング）x: 0〜460 ──────────────────────
  const LX = 80   // 左パネル テキスト中心
  const CY = H / 2

  ctx.font = font(56)
  ctx.textAlign = 'left'
  ctx.fillText('🎸', LX, CY - 110)

  ctx.fillStyle = '#16211f'
  ctx.font = font(64, 'bold')
  ctx.fillText('Pick', LX, CY - 30)

  ctx.fillStyle = '#0e6e72'
  ctx.font = font(22)
  ctx.fillText('会話からフレーズをピックして学ぼう', LX, CY + 16)

  // 区切り線（縦）
  ctx.strokeStyle = 'rgba(14,110,114,0.15)'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(460, 60); ctx.lineTo(460, H - 60); ctx.stroke()

  const dateStr = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  ctx.fillStyle = '#8a948f'
  ctx.font = font(18)
  ctx.fillText(dateStr, LX, CY + 68)

  const effectivePurposeImg = studySubcategory ?? studyPurpose
  const categoryTag = effectivePurposeImg && PURPOSE_SHARE_LABELS[effectivePurposeImg]
    ? ` #${PURPOSE_SHARE_LABELS[effectivePurposeImg].replace(/\s/g, '')}` : ''
  ctx.fillStyle = 'rgba(14,110,114,0.5)'
  ctx.font = font(18)
  ctx.fillText(`#英語学習  #フレーズ学習${categoryTag}`, LX, CY + 100)

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  ctx.fillStyle = '#8a948f'
  ctx.font = font(16)
  ctx.fillText(appUrl, LX, H - 44)

  // ── 右パネル（スコア）x: 460〜1200 ──────────────────────────
  const RX = 830  // 右パネル テキスト中心

  // スコアカード背景
  fillRoundRect(ctx, 490, 60, W - 550, H - 120, 28)
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  fillRoundRect(ctx, 490, 60, W - 550, H - 120, 28)

  // モチベーションテキスト
  ctx.fillStyle = '#5d6b66'
  ctx.font = font(22)
  ctx.textAlign = 'center'
  ctx.fillText(motivationText, RX, 138)

  // スコア %
  ctx.fillStyle = scoreColor
  ctx.font = font(160, 'bold')
  ctx.textAlign = 'center'
  ctx.fillText(`${pct}%`, RX, 330)

  // 問題数
  ctx.fillStyle = '#5d6b66'
  ctx.font = font(28)
  ctx.textAlign = 'center'
  ctx.fillText(`${correct} / ${total} 問正解`, RX, 380)

  // ── 内訳バッジ（3列）────────────────────────────────────────
  const bW = 148, bH = 68, bGap = 14
  const bTotalW = bW * 3 + bGap * 2
  const bX0 = RX - bTotalW / 2

  const badges = [
    { label: '正解', value: correct,   bg: 'rgba(16,185,129,0.12)', fg: '#10b981' },
    { label: '部分', value: partial,   bg: 'rgba(217,119,6,0.12)',  fg: '#d97706' },
    { label: '誤答', value: incorrect, bg: 'rgba(239,68,68,0.12)',  fg: '#ef4444' },
  ]
  badges.forEach(({ label, value, bg, fg }, i) => {
    const bx = bX0 + i * (bW + bGap)
    ctx.fillStyle = bg
    fillRoundRect(ctx, bx, 422, bW, bH, 14)
    ctx.fillStyle = fg
    ctx.font = font(32, 'bold')
    ctx.textAlign = 'center'
    ctx.fillText(String(value), bx + bW / 2, 458)
    ctx.fillStyle = '#5d6b66'
    ctx.font = font(15)
    ctx.fillText(label, bx + bW / 2, 477)
  })

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
    if (error) {
      console.error('[uploadShareImage] Storage upload failed:', error.message, error)
      return null
    }
    const { data } = supabase.storage.from('share-images').getPublicUrl(`${sessionId}.png`)
    console.info('[uploadShareImage] Upload success:', data.publicUrl)
    return data.publicUrl
  } catch (e) {
    console.error('[uploadShareImage] Unexpected error:', e)
    return null
  }
}

/**
 * 結果をシェア。
 * sessionId あり → Twitter Cards URL をツイート（画像は quiz/page.tsx で先行アップロード済み）
 * sessionId なし（モバイル）→ Web Share API でファイルシェア
 * sessionId なし（デスクトップ）→ クリップボードコピー + X 投稿画面を開く
 *
 * 戻り値: 'shared' | 'copied' | 'opened'
 */
export async function openXShare(params: ShareParams): Promise<'shared' | 'copied' | 'opened'> {
  const { sessionId } = params
  const shareText = getShareText(params)

  // ── Twitter Cards: sessionId がある場合 ──────────────────────
  // 【重要】window.open() は click ハンドラ内で同期的に呼ぶ必要がある。
  // await を挟むと Safari がポップアップをブロックする。
  // → 先に Twitter を開き、画像アップロードはバックグラウンドで行う。
  // Twitter クローラーは即時スクレイプしないため、数秒後のアップロード完了で問題なし。
  if (sessionId && typeof window !== 'undefined') {
    const shareUrl = `${window.location.origin}/share/${sessionId}`

    // 【重要】画像アップロードはクイズ完了時（quiz/page.tsx の handleNext）に
    // タブがフォアグラウンドの状態で先行実行済み。
    // ここでは Twitter ウィンドウを開くのみ（Safari suspend 問題を回避）。
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
