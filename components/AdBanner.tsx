'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window { adsbygoogle: unknown[] }
}

interface Props {
  slot: string
  className?: string
}

export function AdBanner({ slot, className = '' }: Props) {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current || !slot) return
    initialized.current = true
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {}
  }, [slot])

  if (!slot) return null

  return (
    <div className={`overflow-hidden ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-client="ca-pub-3375981541016037"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
