import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(145deg, #f5f0e8 0%, #e8ddd0 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '112px',
        }}
      >
        <div style={{ fontSize: '280px', lineHeight: 1 }}>🎸</div>
        <div
          style={{
            fontSize: '72px',
            fontWeight: 800,
            color: '#5c3d1e',
            letterSpacing: '-2px',
            marginTop: '-8px',
            fontFamily: 'Georgia, serif',
          }}
        >
          Pick
        </div>
      </div>
    ),
    { ...size }
  )
}
