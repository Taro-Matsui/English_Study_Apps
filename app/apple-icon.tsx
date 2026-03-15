import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f172a',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '112px',
            height: '112px',
            background: '#1e293b',
            borderRadius: '22px',
          }}
        >
          <div
            style={{
              fontSize: '70px',
              fontWeight: 800,
              color: '#3b82f6',
              lineHeight: 1,
              letterSpacing: '-3px',
            }}
          >
            EE
          </div>
        </div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#64748b',
            letterSpacing: '3px',
          }}
        >
          ENG
        </div>
      </div>
    ),
    { ...size }
  )
}
