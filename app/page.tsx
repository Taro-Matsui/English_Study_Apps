import { getSupabase } from '@/lib/supabase'
import { HomeContent } from '@/components/HomeContent'

export const dynamic = 'force-dynamic'

async function getStats() {
  try {
    const db = getSupabase()
    const [phraseRes, sourceRes] = await Promise.all([
      db.from('phrases').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      db.from('phrases').select('source_title').is('deleted_at', null).not('source_title', 'is', null),
    ])
    const phraseCount = phraseRes.count ?? 0
    const sourceCount = new Set(
      (sourceRes.data ?? []).map((r: { source_title: string }) => r.source_title)
    ).size
    return { phraseCount, sourceCount }
  } catch {
    return { phraseCount: null, sourceCount: null }
  }
}

export default async function Home() {
  const { phraseCount, sourceCount } = await getStats()
  return <HomeContent phraseCount={phraseCount} sourceCount={sourceCount} />
}
