import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

const PURPOSE_LABELS: Record<string, string> = {
  meeting:   '#ミーティング英語',
  review:    '#コードレビュー英語',
  reading:   '#技術文書英語',
  interview: '#面接英語',
  general:   '#ビジネス英語',
}

export async function GET(req: NextRequest) {
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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          background: '#f5f0e8',
          padding: '48px 40px',
        }}
      >
        {/* ヘッダー: アプリ名 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 12 }}>🎣</div>
          <div style={{ fontSize: 56, fontWeight: 800, color: '#4a3020', letterSpacing: '-2px', lineHeight: 1 }}>
            Reel
          </div>
          <div style={{ fontSize: 22, color: '#8b6340', marginTop: 6 }}>
            実際の会話から学ぶ英語フレーズ
          </div>
        </div>

        {/* 区切り線 */}
        <div style={{ width: '100%', height: 1.5, background: 'rgba(139,115,85,0.25)', marginBottom: 36 }} />

        {/* スコアカード */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: 'rgba(255,255,255,0.75)',
            borderRadius: 28,
            padding: '40px 60px',
            width: '100%',
            marginBottom: 28,
          }}
        >
          <div style={{ fontSize: 24, color: '#7a6248', marginBottom: 16 }}>{motivationText}</div>
          <div style={{ fontSize: 120, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
            {pct}%
          </div>
          <div style={{ fontSize: 30, color: '#7a6248', marginTop: 12 }}>
            {correct} / {total} 問正解
          </div>
        </div>

        {/* バッジ行 */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
          {[
            { label: '正解', value: correct, bg: 'rgba(16,185,129,0.12)', fg: '#10b981' },
            { label: '部分', value: partial,  bg: 'rgba(217,119,6,0.12)',  fg: '#d97706' },
            { label: '誤答', value: incorrect, bg: 'rgba(239,68,68,0.12)', fg: '#ef4444' },
          ].map(({ label, value, bg, fg }) => (
            <div
              key={label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                background: bg,
                borderRadius: 18,
                padding: '16px 36px',
                minWidth: 130,
              }}
            >
              <div style={{ fontSize: 40, fontWeight: 800, color: fg }}>{value}</div>
              <div style={{ fontSize: 18, color: '#7a6248' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* 日付 */}
        <div style={{ fontSize: 20, color: '#a08060', marginBottom: 12 }}>{dateStr}</div>

        {/* ハッシュタグ */}
        <div style={{ fontSize: 20, color: 'rgba(139,99,64,0.6)' }}>
          #英語学習　#フレーズ学習{purposeTag ? `　${purposeTag}` : ''}
        </div>
      </div>
    ),
    {
      width: 630,
      height: 900,
    },
  )
}
