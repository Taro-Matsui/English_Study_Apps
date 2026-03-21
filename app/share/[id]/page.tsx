import { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getSupabaseAdmin } from '@/lib/supabase'

interface Props {
  params: { id: string }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function fetchSession(id: string) {
  if (!UUID_RE.test(id)) return null
  const db = getSupabaseAdmin()
  const { data } = await db
    .from('quiz_sessions')
    .select('correct_count, total_questions, completed_at')
    .eq('id', id)
    .single()
  return data
}

function getBaseUrl() {
  const headersList = headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = host.includes('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await fetchSession(params.id)
  if (!session) return { title: 'Reel' }

  const pct = session.total_questions
    ? Math.round((session.correct_count / session.total_questions) * 100)
    : 0
  const incorrect = session.total_questions - session.correct_count

  const base = getBaseUrl()
  const ogUrl = `${base}/api/og?pct=${pct}&correct=${session.correct_count}&total=${session.total_questions}&partial=0&incorrect=${incorrect}`

  return {
    title: `Reel クイズ結果 ${pct}% — 実際の会話から学ぶ英語フレーズ`,
    description: `${pct}% 正解（${session.correct_count}/${session.total_questions}問）`,
    openGraph: {
      title: `Reel クイズ結果 ${pct}%`,
      description: `${session.correct_count}/${session.total_questions}問正解`,
      images: [{ url: ogUrl, width: 630, height: 900 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Reel クイズ結果 ${pct}%`,
      description: `${session.correct_count}/${session.total_questions}問正解`,
      images: [ogUrl],
    },
  }
}

export default async function SharePage({ params }: Props) {
  const session = await fetchSession(params.id)

  if (!session) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-4xl">🎣</p>
        <p className="text-sm text-gray-500">このシェアリンクは見つかりませんでした</p>
        <Link href="/" className="text-sm text-blue-600 hover:underline">Reel を始める</Link>
      </div>
    )
  }

  const pct = session.total_questions
    ? Math.round((session.correct_count / session.total_questions) * 100)
    : 0
  const scoreColor =
    pct >= 80 ? 'text-emerald-600' :
    pct >= 60 ? 'text-amber-600' :
               'text-red-500'
  const bgColor =
    pct >= 80 ? 'bg-emerald-100' :
    pct >= 60 ? 'bg-amber-100' :
               'bg-red-100'

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* ヘッダー */}
        <div>
          <p className="text-4xl mb-2">🎣</p>
          <p className="text-2xl font-bold text-amber-900">Reel</p>
          <p className="text-sm text-amber-700 mt-1">実際の会話から学ぶ英語フレーズ</p>
        </div>

        {/* スコアカード */}
        <div className="bg-white/80 rounded-3xl border border-amber-200 shadow-sm p-8 space-y-3">
          <p className="text-sm text-amber-700 font-medium">クイズ結果</p>
          <p className={`text-7xl font-bold ${scoreColor}`}>{pct}<span className="text-3xl">%</span></p>
          <div className={`inline-flex items-center gap-1.5 ${bgColor} rounded-full px-4 py-1.5`}>
            <span className={`text-sm font-semibold ${scoreColor}`}>
              {session.correct_count} / {session.total_questions} 問正解
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/quiz"
            className="block w-full py-3.5 rounded-2xl bg-amber-800 text-white text-sm font-bold hover:bg-amber-700 transition-colors text-center"
          >
            自分も挑戦する
          </Link>
          <Link
            href="/"
            className="block w-full py-3 rounded-2xl bg-white border border-amber-200 text-amber-800 text-sm font-medium hover:bg-amber-50 transition-colors text-center"
          >
            Reel とは？
          </Link>
        </div>
      </div>
    </div>
  )
}
