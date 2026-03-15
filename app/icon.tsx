import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
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
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '320px',
            height: '320px',
            background: '#1e293b',
            borderRadius: '64px',
          }}
        >
          <div
            style={{
              fontSize: '200px',
              fontWeight: 800,
              color: '#3b82f6',
              lineHeight: 1,
              letterSpacing: '-8px',
            }}
          >
            EE
          </div>
        </div>
        <div
          style={{
            fontSize: '56px',
            fontWeight: 700,
            color: '#64748b',
            letterSpacing: '8px',
          }}
        >
          ENG
        </div>
      </div>
    ),
    { ...size }
  )
}
