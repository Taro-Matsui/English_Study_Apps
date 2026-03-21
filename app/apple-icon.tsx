import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
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
          borderRadius: '40px',
        }}
      >
        <div style={{ fontSize: '96px', lineHeight: 1 }}>🎣</div>
        <div
          style={{
            fontSize: '26px',
            fontWeight: 800,
            color: '#5c3d1e',
            letterSpacing: '-1px',
            marginTop: '-4px',
            fontFamily: 'Georgia, serif',
          }}
        >
          Reel
        </div>
      </div>
    ),
    { ...size }
  )
}
