'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage, LangToggle } from '@/lib/i18n'
import { useSettings } from '@/lib/settings'

/** 既知の声名から性別を推定（ヒューリスティック）*/
function guessGender(voice: SpeechSynthesisVoice): '♀' | '♂' | '' {
  const n = voice.name.toLowerCase()
  const female = ['samantha', 'zira', 'victoria', 'karen', 'moira', 'fiona', 'tessa', 'veena', 'kyoko', 'mei', 'yuna', 'siri', 'cortana', 'ava', 'susan', 'kate']
  const male   = ['alex', 'fred', 'daniel', 'david', 'james', 'rishi', 'lee', 'mark', 'thomas', 'oliver', 'arthur', 'gordon']
  if (female.some((k) => n.includes(k))) return '♀'
  if (male.some((k) => n.includes(k))) return '♂'
  return ''
}

export default function SettingsPage() {
  const { lang } = useLanguage()
  const { settings, setVoice, setSkipMastered, clearMastered } = useSettings()
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [testingURI, setTestingURI] = useState<string | null>(null)

  const ja = lang === 'ja'

  useEffect(() => {
    function loadVoices() {
      const all = window.speechSynthesis?.getVoices() ?? []
      // 英語音声のみ表示（en-US 優先、その他 en-* も含む）
      const en = all.filter((v) => v.lang.startsWith('en'))
      setVoices(en)
    }
    loadVoices()
    if (typeof window !== 'undefined') {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.onvoiceschanged = null
      }
    }
  }, [])

  function testVoice(voice: SpeechSynthesisVoice) {
    window.speechSynthesis.cancel()
    setTestingURI(voice.voiceURI)
    const utt = new SpeechSynthesisUtterance('Hello! This is a test of the selected voice.')
    utt.voice = voice
    utt.lang = voice.lang
    utt.rate = 0.88
    utt.onend = () => setTestingURI(null)
    window.speechSynthesis.speak(utt)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-white/5">
        <div className="px-4 pt-3 pb-3 flex items-center gap-3 max-w-lg mx-auto">
          <Link href="/" className="text-slate-500 hover:text-slate-300 text-lg px-1 -ml-1">‹</Link>
          <h1 className="flex-1 text-sm font-semibold">{ja ? '設定' : 'Settings'}</h1>
          <LangToggle />
        </div>
      </div>

      <div className="px-4 pt-5 pb-12 max-w-lg mx-auto space-y-8">

        {/* 音声セクション */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {ja ? '読み上げ音声' : 'Pronunciation Voice'}
          </h2>

          {voices.length === 0 && (
            <p className="text-sm text-slate-500 py-2">
              {ja ? '音声リストを読み込み中...' : 'Loading voices...'}
            </p>
          )}

          <div className="space-y-2">
            {/* ブラウザ既定 */}
            <div
              onClick={() => setVoice(null)}
              className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                settings.voiceURI === null
                  ? 'border-blue-500/50 bg-blue-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{ja ? 'ブラウザ既定' : 'Browser Default'}</p>
                <p className="text-xs text-slate-500 mt-0.5">{ja ? 'システムの既定音声を使用' : 'Use system default voice'}</p>
              </div>
              {settings.voiceURI === null && <span className="text-blue-400 text-xs font-bold">✓</span>}
            </div>

            {/* 音声一覧 */}
            {voices.map((v) => {
              const gender = guessGender(v)
              const isSel = settings.voiceURI === v.voiceURI
              const isTesting = testingURI === v.voiceURI
              return (
                <div
                  key={v.voiceURI}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    isSel ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex-1 cursor-pointer" onClick={() => setVoice(v.voiceURI)}>
                    <p className="text-sm font-medium">
                      {gender && (
                        <span className={`mr-1.5 text-xs font-bold ${gender === '♀' ? 'text-pink-400' : 'text-sky-400'}`}>
                          {gender}
                        </span>
                      )}
                      {v.name}
                    </p>
                    <p className="text-xs text-slate-500">{v.lang}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isSel && <span className="text-blue-400 text-xs font-bold">✓</span>}
                    <button
                      onClick={() => testVoice(v)}
                      className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                        isTesting ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-slate-400 hover:bg-white/20'
                      }`}
                    >
                      {isTesting ? '▶' : '🔊'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* クイズ設定セクション */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {ja ? 'クイズ設定' : 'Quiz Settings'}
          </h2>

          {/* スキップ設定 */}
          <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={settings.skipMastered}
              onChange={(e) => setSkipMastered(e.target.checked)}
              className="w-4 h-4 accent-blue-500 flex-shrink-0"
            />
            <div>
              <p className="text-sm font-medium">
                {ja ? '正解済みフレーズをスキップ' : 'Skip already-correct phrases'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {ja
                  ? '一度正解したフレーズはクイズに出なくなります'
                  : 'Phrases you answered correctly will not appear again'}
              </p>
            </div>
          </label>

          {/* 習得済みフレーズ数 + リセット */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
            <div>
              <p className="text-sm font-medium">{ja ? '習得済みフレーズ' : 'Mastered phrases'}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {settings.masteredIds.length}
                {ja ? ' 件' : ' phrases'}
              </p>
            </div>
            <button
              onClick={clearMastered}
              disabled={settings.masteredIds.length === 0}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {ja ? 'リセット' : 'Reset'}
            </button>
          </div>
        </section>

      </div>
    </div>
  )
}
