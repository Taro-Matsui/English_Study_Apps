import { ImageResponse } from 'next/og'

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
          borderRadius: '28px',
          gap: '2px',
        }}
      >
        <div style={{ fontSize: '84px', color: '#ffffff', lineHeight: 1, fontWeight: 700 }}>
          英
        </div>
        <div style={{ fontSize: '26px', color: '#3b82f6', letterSpacing: '4px', fontWeight: 700 }}>
          ENG
        </div>
      </div>
    ),
    { ...size }
  )
}
