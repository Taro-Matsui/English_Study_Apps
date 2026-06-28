import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const PURPOSE_LABELS: Record<string, string> = {
  // 新カテゴリ
  business_general:  '#ビジネス英語',
  business_engineer: '#エンジニア英語',
  hobby_lifestyle:   '#旅行英語',
  hobby_reading:     '#読書英語',
  // エンジニア サブカテゴリ
  meeting:           '#ミーティング英語',
  review:            '#コードレビュー英語',
  conference:        '#カンファレンス英語',
  // 後方互換
  reading:           '#技術文書英語',
  interview:         '#面接英語',
  general:           '#ビジネス英語',
}

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin
  const logoUrl = `${origin}/pick_logo.png`
  const { searchParams } = new URL(req.url)
  const pct     = Math.max(0, Math.min(100, parseInt(searchParams.get('pct')     ?? '0', 10)))
  const correct = Math.max(0, parseInt(searchParams.get('correct') ?? '0', 10))
  const total   = Math.max(1, parseInt(searchParams.get('total')   ?? '1', 10))
  const partial   = Math.max(0, parseInt(searchParams.get('partial')   ?? '0', 10))
  const incorrect = Math.max(0, parseInt(searchParams.get('incorrect') ?? '0', 10))
  const purpose = searchParams.get('purpose') ?? ''

  const scoreColor =
    pct >= 80 ? '#10b981' :
    pct >= 60 ? '#d97706' :
               '#ef4444'

  const motivationText =
    pct >= 80 ? '素晴らしい！この調子で 🔥' :
    pct >= 60 ? 'いい調子！また明日も 💡' :
               '続けることが上達の近道 ✨'

  const dateStr = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const purposeTag = PURPOSE_LABELS[purpose] ?? ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          background: 'linear-gradient(135deg, #f7f6f2 0%, #eef1f0 100%)',
        }}
      >
        {/* 左パネル: ブランディング */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 48px',
            width: 420,
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Pick" width={80} height={80} style={{ borderRadius: 16, marginBottom: 16 }} />
          <div style={{ fontSize: 68, fontWeight: 800, color: '#16211f', lineHeight: 1, marginBottom: 12 }}>
            Pick
          </div>
          <div style={{ fontSize: 22, color: '#0e6e72', marginBottom: 40 }}>
            会話からフレーズをピックして学ぼう
          </div>
          <div style={{ fontSize: 18, color: '#8a948f', marginBottom: 10 }}>{dateStr}</div>
          <div style={{ fontSize: 17, color: 'rgba(14,110,114,0.5)' }}>
            #英語学習　#フレーズ学習{purposeTag ? `　${purposeTag}` : ''}
          </div>
        </div>

        {/* 縦区切り線 */}
        <div style={{ width: 1.5, background: 'rgba(14,110,114,0.15)', margin: '60px 0' }} />

        {/* 右パネル: スコア */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            background: 'rgba(255,255,255,0.65)',
            borderRadius: '0 0 0 0',
            padding: '48px 40px',
          }}
        >
          <div style={{ fontSize: 22, color: '#5d6b66', marginBottom: 8 }}>{motivationText}</div>
          <div style={{ fontSize: 150, fontWeight: 800, color: scoreColor, lineHeight: 1, marginBottom: 12 }}>
            {pct}%
          </div>
          <div style={{ fontSize: 28, color: '#5d6b66', marginBottom: 32 }}>
            {correct} / {total} 問正解
          </div>
          {/* バッジ */}
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { label: '正解', value: correct,   bg: 'rgba(16,185,129,0.12)', fg: '#10b981' },
              { label: '部分', value: partial,   bg: 'rgba(217,119,6,0.12)',  fg: '#d97706' },
              { label: '誤答', value: incorrect, bg: 'rgba(239,68,68,0.12)',  fg: '#ef4444' },
            ].map(({ label, value, bg, fg }) => (
              <div
                key={label}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  background: bg, borderRadius: 14, padding: '14px 32px', minWidth: 120,
                }}
              >
                <div style={{ fontSize: 38, fontWeight: 800, color: fg }}>{value}</div>
                <div style={{ fontSize: 16, color: '#5d6b66' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
