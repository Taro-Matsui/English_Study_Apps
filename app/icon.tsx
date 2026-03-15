import { ImageResponse } from 'next/og'

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
          borderRadius: '80px',
          gap: '8px',
        }}
      >
        <div style={{ fontSize: '240px', color: '#ffffff', lineHeight: 1, fontWeight: 700 }}>
          英
        </div>
        <div style={{ fontSize: '72px', color: '#3b82f6', letterSpacing: '12px', fontWeight: 700 }}>
          ENG
        </div>
      </div>
    ),
    { ...size }
  )
}
