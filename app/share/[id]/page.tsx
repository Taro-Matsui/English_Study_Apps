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
  // Railway はリバースプロキシのため host が localhost:8080 になる。
  // x-forwarded-host / x-forwarded-proto から公開 origin を取得する。
  const forwardedHost = headersList.get('x-forwarded-host')
  const forwardedProto = headersList.get('x-forwarded-proto') ?? 'https'
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = host.includes('localhost') ? 'http' : 'https'
  return `${proto}://${host}`
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function getOgImageUrl(params: {
  id: string
  pct: number
  correctCount: number
  totalQuestions: number
  completedAt: string
  base: string
}): string {
  const { id, pct, correctCount, totalQuestions, completedAt, base } = params
  const sessionAge = Date.now() - new Date(completedAt).getTime()
  const incorrect = totalQuestions - correctCount

  // 1日以内 → Supabase Storage の静的画像（Twitter クローラーが高速に取得可能）
  if (sessionAge < ONE_DAY_MS) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/share-images/${id}.png`
  }
  // 1日超 → edge runtime で動的生成（Storage の画像は削除済みの可能性）
  return `${base}/api/og?pct=${pct}&correct=${correctCount}&total=${totalQuestions}&partial=0&incorrect=${incorrect}`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await fetchSession(params.id)
  if (!session) return { title: 'Pick' }

  const pct = session.total_questions
    ? Math.round((session.correct_count / session.total_questions) * 100)
    : 0

  const base = getBaseUrl()
  const ogUrl = getOgImageUrl({
    id: params.id,
    pct,
    correctCount: session.correct_count,
    totalQuestions: session.total_questions,
    completedAt: session.completed_at,
    base,
  })

  return {
    title: `Pick チャレンジ結果 ${pct}% — 会話からフレーズをPickして学ぼう`,
    description: `${pct}% 正解（${session.correct_count}/${session.total_questions}問）`,
    openGraph: {
      title: `Pick チャレンジ結果 ${pct}%`,
      description: `${session.correct_count}/${session.total_questions}問正解`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Pick チャレンジ結果 ${pct}%`,
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
        <p className="text-4xl">🎸</p>
        <p className="text-sm text-gray-500">このシェアリンクは見つかりませんでした</p>
        <Link href="/" className="text-sm text-blue-600 hover:underline">Pick を始める</Link>
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
          <p className="text-4xl mb-2">🎸</p>
          <p className="text-2xl font-bold text-amber-900">Pick</p>
          <p className="text-sm text-amber-700 mt-1">会話からフレーズをPickして学ぼう</p>
        </div>

        {/* スコアカード */}
        <div className="bg-white/80 rounded-3xl border border-amber-200 shadow-sm p-8 space-y-3">
          <p className="text-sm text-amber-700 font-medium">チャレンジ結果</p>
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
            Pick とは？
          </Link>
        </div>
      </div>
    </div>
  )
}
