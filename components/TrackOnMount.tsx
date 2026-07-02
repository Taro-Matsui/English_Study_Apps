'use client'

import { useEffect } from 'react'
import { track } from '@/lib/track'

/**
 * マウント時に1度だけ track(event) を発火する描画なしの薄いラッパ。
 * Server Component（LPページ等）から登録前ファネルイベントを撃つために使う。
 */
export function TrackOnMount({
  event,
  props,
}: {
  event: string
  props?: Record<string, unknown>
}) {
  useEffect(() => {
    track(event, props)
    // event は静的、props は初回のみで十分（登録前ファネルの到達計測）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
