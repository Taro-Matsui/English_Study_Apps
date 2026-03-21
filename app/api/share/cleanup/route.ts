import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const CLEANUP_SECRET = process.env.CLEANUP_SECRET ?? ''
const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * GET /api/share/cleanup?secret=CLEANUP_SECRET
 * share-images バケットの1日以上前の画像を削除する。
 * Railway Cron などから定期実行すること。
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') ?? ''
  if (CLEANUP_SECRET && secret !== CLEANUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getSupabaseAdmin()
    const { data: files, error } = await db.storage
      .from('share-images')
      .list('', { limit: 1000 })

    if (error) throw error
    if (!files?.length) return NextResponse.json({ deleted: 0 })

    const cutoff = Date.now() - ONE_DAY_MS
    const old = files.filter((f) => {
      const created = f.created_at ? new Date(f.created_at).getTime() : 0
      return created < cutoff
    })

    if (!old.length) return NextResponse.json({ deleted: 0 })

    const { error: delErr } = await db.storage
      .from('share-images')
      .remove(old.map((f) => f.name))

    if (delErr) throw delErr

    return NextResponse.json({ deleted: old.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    )
  }
}
