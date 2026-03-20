import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getUser } from '@/lib/auth'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ phrase_count: 0, source_count: 0 })

  const db = getSupabaseAdmin()

  const [phraseRes, sourceRes] = await Promise.all([
    db
      .from('phrases')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null),
    db
      .from('phrases')
      .select('source_title')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .not('source_title', 'is', null),
  ])

  const phraseCount = phraseRes.count ?? 0
  const sourceCount = new Set(
    (sourceRes.data ?? []).map((r: { source_title: string }) => r.source_title)
  ).size

  return NextResponse.json({ phrase_count: phraseCount, source_count: sourceCount })
}
