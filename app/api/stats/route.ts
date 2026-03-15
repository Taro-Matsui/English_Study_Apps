import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function GET() {
  const db = getSupabase()

  const [phraseRes, sourceRes] = await Promise.all([
    db
      .from('phrases')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    db
      .from('phrases')
      .select('source_title')
      .is('deleted_at', null)
      .not('source_title', 'is', null),
  ])

  const phraseCount = phraseRes.count ?? 0
  // ソースファイル数は source_title のユニーク件数
  const sourceCount = new Set(
    (sourceRes.data ?? []).map((r: { source_title: string }) => r.source_title)
  ).size

  return NextResponse.json({ phrase_count: phraseCount, source_count: sourceCount })
}
