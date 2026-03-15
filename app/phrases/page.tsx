'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Phrase, SourceType } from '@/types'

const SOURCE_TYPES: SourceType[] = ['DSH_Event', 'YouTube', 'Podcast']

const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'とても簡単', 2: '簡単', 3: '普通', 4: '難しい', 5: 'とても難しい',
}
const DIFFICULTY_COLOR: Record<number, string> = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-yellow-100 text-yellow-700',
  4: 'bg-orange-100 text-orange-700',
  5: 'bg-red-100 text-red-700',
}

export default function PhrasesPage() {
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [source, setSource] = useState('')
  const [speaking, setSpeaking] = useState<string | null>(null)

  const fetchPhrases = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (source) params.set('source', source)
    const res = await fetch(`/api/phrases?${params}`)
    const data = await res.json()
    setPhrases(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [q, source])

  useEffect(() => {
    const id = setTimeout(fetchPhrases, 300)
    return () => clearTimeout(id)
  }, [fetchPhrases])

  function speak(text: string, id: string) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'en-US'
    utt.rate = 0.9
    utt.onend = () => setSpeaking(null)
    setSpeaking(id)
    window.speechSynthesis.speak(utt)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← ホーム</Link>
            <h1 className="text-xl font-bold text-gray-900 mt-0.5">フレーズ一覧</h1>
          </div>
          <span className="text-sm text-gray-400">{phrases.length}件</span>
        </div>

        {/* 検索・フィルター */}
        <div className="space-y-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="フレーズ・日本語で検索..."
            className="bg-white"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSource('')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                source === '' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              すべて
            </button>
            {SOURCE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSource(source === type ? '' : type)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  source === type ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* 一覧 */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : phrases.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">フレーズが見つかりません</p>
            {!q && !source && (
              <Link href="/admin/import" className="mt-3 inline-block text-sm text-blue-500 hover:underline">
                インポートしてフレーズを追加する →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {phrases.map((p) => (
              <Card key={p.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-base">{p.phrase}</span>
                        {p.pronunciation && (
                          <span className="text-xs text-gray-400 font-normal">{p.pronunciation}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[p.difficulty] ?? DIFFICULTY_COLOR[3]}`}>
                          {DIFFICULTY_LABEL[p.difficulty] ?? '普通'}
                        </span>
                      </div>
                      <p className="text-sm text-blue-700 mt-1 font-medium">{p.meaning_ja}</p>
                      {p.original_context && (
                        <p className="text-xs text-gray-400 mt-1.5 italic leading-relaxed">
                          &quot;{p.original_context}&quot;
                        </p>
                      )}
                      {p.source_title && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-xs font-normal">{p.source_type}</Badge>
                          <span className="text-xs text-gray-400 truncate">{p.source_title}</span>
                        </div>
                      )}
                    </div>
                    {/* 発音ボタン (Web Speech API) */}
                    <button
                      onClick={() => speak(p.phrase, p.id)}
                      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                        speaking === p.id
                          ? 'bg-blue-100 text-blue-600 animate-pulse'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      title="発音を聞く"
                    >
                      🔊
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
