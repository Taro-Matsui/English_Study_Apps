'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage, LangToggle } from '@/lib/i18n'
import { useSettings, getVoiceForPreset, VoicePreset } from '@/lib/settings'
import { useAuth } from '@/lib/auth-context'
import { resetTutorialAndHints } from '@/components/HintBubble'
import { resetAnnouncements } from '@/components/AnnouncementBell'
import { ANNOUNCEMENTS } from '@/lib/announcements'
import { X_URL } from '@/lib/social'

const PURPOSE_LABELS: Record<string, string> = {
  meeting:   '💬 ミーティング・日常会話',
  review:    '👨‍💻 コードレビュー・Slack',
  reading:   '📚 技術ドキュメント読解',
  interview: '🎤 採用面接・プレゼン',
  general:   '🌐 総合的に学びたい',
}
const LEVEL_LABELS: Record<string, string> = {
  beginner:     '初級',
  intermediate: '中級',
  advanced:     '上級',
}

const PRESET_CONFIG: { key: VoicePreset; label: string; desc_ja: string; desc_en: string }[] = [
  { key: 'default',   label: 'ブラウザ既定', desc_ja: 'OS・ブラウザの既定音声', desc_en: 'System default voice' },
  { key: 'us-female', label: '♀ US Female', desc_ja: '米国英語・女性音声',       desc_en: 'American English, female' },
  { key: 'us-male',   label: '♂ US Male',   desc_ja: '米国英語・男性音声',       desc_en: 'American English, male' },
  { key: 'indian',    label: '🇮🇳 Indian EN', desc_ja: 'インド英語音声 (en-IN)',  desc_en: 'Indian English (en-IN)' },
  { key: 'custom',    label: '🎛 カスタム',  desc_ja: '一覧から音声を選ぶ',       desc_en: 'Choose from voice list' },
]

/** 既知の声名から性別を推定（カスタム音声リスト表示用） */
function guessGender(voice: SpeechSynthesisVoice): '♀' | '♂' | '' {
  const n = voice.name.toLowerCase()
  if (['samantha','zira','victoria','karen','moira','fiona','ava','kate','susan','allison']
    .some((k) => n.includes(k))) return '♀'
  if (['alex','fred','david','daniel','mark','arthur','gordon','oliver','thomas','lee']
    .some((k) => n.includes(k))) return '♂'
  return ''
}

export default function SettingsPage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const { settings, setVoicePreset, setVoice, setSkipMastered, setContextHint, setShowPronunciation, clearMastered } = useSettings()
  const { user } = useAuth()

  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    try {
      const seen: string[] = JSON.parse(localStorage.getItem('seen_announcements') ?? '[]')
      setUnreadCount(ANNOUNCEMENTS.filter((a) => !seen.includes(a.id)).length)
    } catch {
      setUnreadCount(0)
    }
  }, [])

  function handleResetTutorial() {
    if (!user?.id) return
    resetTutorialAndHints(user.id)
    alert('チュートリアルと操作ヒントをリセットしました。ホームページに戻ると再表示されます。')
  }

  function handleResetAnnouncements() {
    resetAnnouncements()
    setUnreadCount(ANNOUNCEMENTS.length)
    alert('お知らせをすべて未読にリセットしました。')
  }

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.push('/login')
  }

  function handleExport() {
    window.location.href = '/api/user/export'
  }

  async function handleDeleteAccount() {
    if (deleteInput !== '削除する') return
    setDeleting(true)
    try {
      const res = await fetch('/api/user/delete-account', { method: 'POST' })
      if (res.ok) {
        router.push('/login')
      } else {
        const d = await res.json()
        alert(d.error ?? 'アカウントの削除に失敗しました')
      }
    } catch {
      alert('通信エラーが発生しました')
    }
    setDeleting(false)
  }
  const studyPurpose = user?.user_metadata?.study_purpose as string | undefined
  const studyLevel = user?.user_metadata?.study_level as string | undefined
  const studyDomain = user?.user_metadata?.study_domain as string | undefined
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [testingKey, setTestingKey] = useState<string | null>(null)
  const [showCustom, setShowCustom] = useState(settings.voicePreset === 'custom')

  const ja = lang === 'ja'

  useEffect(() => {
    function loadVoices() {
      const all = window.speechSynthesis?.getVoices() ?? []
      setVoices(all.filter((v) => v.lang.startsWith('en')))
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  function testPreset(preset: VoicePreset) {
    window.speechSynthesis.cancel()
    setTestingKey(`preset-${preset}`)
    const voice = getVoiceForPreset(preset, settings.voiceURI)
    const utt = new SpeechSynthesisUtterance('Hello, this is a voice test.')
    if (voice) { utt.voice = voice; utt.lang = voice.lang } else { utt.lang = 'en-US' }
    utt.rate = 0.88
    utt.onend = () => setTestingKey(null)
    window.speechSynthesis.speak(utt)
  }

  function testCustomVoice(voice: SpeechSynthesisVoice) {
    window.speechSynthesis.cancel()
    setTestingKey(`custom-${voice.voiceURI}`)
    const utt = new SpeechSynthesisUtterance('Hello, this is a voice test.')
    utt.voice = voice; utt.lang = voice.lang; utt.rate = 0.88
    utt.onend = () => setTestingKey(null)
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

        {/* 学習プロフィール */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {ja ? '学習プロフィール' : 'Learning Profile'}
          </h2>
          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{ja ? '目的' : 'Purpose'}</span>
                  <span className="text-sm text-white">
                    {studyPurpose ? PURPOSE_LABELS[studyPurpose] ?? studyPurpose : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{ja ? 'レベル' : 'Level'}</span>
                  <span className="text-sm text-white">
                    {studyLevel ? LEVEL_LABELS[studyLevel] ?? studyLevel : '—'}
                  </span>
                </div>
                {studyDomain && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{ja ? '領域' : 'Domain'}</span>
                    <span className="text-sm text-white">{studyDomain}</span>
                  </div>
                )}
              </div>
              <Link
                href="/onboarding"
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors flex-shrink-0"
              >
                {ja ? '変更' : 'Edit'}
              </Link>
            </div>
          </div>
        </section>

        {/* 音声プリセット */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {ja ? '読み上げ音声' : 'Pronunciation Voice'}
          </h2>

          <div className="space-y-2">
            {PRESET_CONFIG.map(({ key, label, desc_ja, desc_en }) => {
              const isSel = settings.voicePreset === key
              const isTesting = testingKey === `preset-${key}`
              const isCustomEntry = key === 'custom'

              // カスタムは選択時に展開するだけ
              if (isCustomEntry) {
                return (
                  <div key={key}>
                    <div
                      onClick={() => { setVoicePreset('custom'); setShowCustom(true) }}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        isSel ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ja ? desc_ja : desc_en}</p>
                      </div>
                      {isSel && <span className="text-blue-400 text-xs font-bold">✓</span>}
                      <span className="text-slate-500 text-xs">{showCustom ? '▲' : '▼'}</span>
                    </div>

                    {/* カスタム音声リスト */}
                    {showCustom && (
                      <div className="mt-1 ml-3 space-y-1.5 max-h-64 overflow-y-auto pr-1">
                        {voices.length === 0 && (
                          <p className="text-xs text-slate-500 py-2">
                            {ja ? '音声リストを読み込み中...' : 'Loading voices...'}
                          </p>
                        )}
                        {voices.map((v) => {
                          const gender = guessGender(v)
                          const isSelVoice = isSel && settings.voiceURI === v.voiceURI
                          const isTestingV = testingKey === `custom-${v.voiceURI}`
                          return (
                            <div
                              key={v.voiceURI}
                              className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                                isSelVoice ? 'border-blue-500/40 bg-blue-500/10' : 'border-white/5 bg-white/3 hover:bg-white/8'
                              }`}
                            >
                              <div className="flex-1 cursor-pointer" onClick={() => setVoice(v.voiceURI)}>
                                <p className="text-xs font-medium">
                                  {gender && <span className={`mr-1 ${gender === '♀' ? 'text-pink-400' : 'text-sky-400'}`}>{gender}</span>}
                                  {v.name}
                                  <span className="ml-1.5 text-slate-600 font-normal">{v.lang}</span>
                                </p>
                              </div>
                              {isSelVoice && <span className="text-blue-400 text-[10px] font-bold">✓</span>}
                              <button
                                onClick={() => testCustomVoice(v)}
                                className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                                  isTestingV ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-slate-400 hover:bg-white/20'
                                }`}
                              >
                                {isTestingV ? '▶' : '🔊'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    isSel ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex-1 cursor-pointer" onClick={() => { setVoicePreset(key); setShowCustom(false) }}>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{ja ? desc_ja : desc_en}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isSel && <span className="text-blue-400 text-xs font-bold">✓</span>}
                    {key !== 'default' && (
                      <button
                        onClick={() => testPreset(key)}
                        className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                          isTesting ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-slate-400 hover:bg-white/20'
                        }`}
                      >
                        {isTesting ? '▶' : '🔊'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* インド英語が利用可能かチェック */}
          {voices.length > 0 && !voices.some((v) => v.lang.startsWith('en-IN') || v.lang.startsWith('en_IN')) && (
            <p className="text-xs text-amber-500/80">
              {ja
                ? '⚠ このデバイスにはインド英語音声がインストールされていません。OSの言語設定から追加できます。'
                : '⚠ Indian English voice not found on this device. Install via OS language settings.'}
            </p>
          )}
        </section>

        {/* クイズ設定 */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {ja ? 'クイズ設定' : 'Quiz Settings'}
          </h2>

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
                {ja ? '一度正解したフレーズはクイズに出なくなります' : 'Phrases answered correctly will not appear again'}
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={settings.contextHint}
              onChange={(e) => setContextHint(e.target.checked)}
              className="w-4 h-4 accent-blue-500 flex-shrink-0"
            />
            <div>
              <p className="text-sm font-medium">
                {ja ? 'コンテキストヒントを表示' : 'Show context hint'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {ja ? 'クイズ中に例文（フレーズ部分をマスク）を表示します' : 'Show example sentence with phrase masked during quiz'}
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={settings.showPronunciation}
              onChange={(e) => setShowPronunciation(e.target.checked)}
              className="w-4 h-4 accent-blue-500 flex-shrink-0"
            />
            <div>
              <p className="text-sm font-medium">
                {ja ? '発音（カタカナ）を表示' : 'Show pronunciation (katakana)'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {ja ? 'フレーズ一覧にカタカナ読みを表示します' : 'Show katakana reading in the phrase list'}
              </p>
            </div>
          </label>

          <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5">
            <div>
              <p className="text-sm font-medium">{ja ? '習得済みフレーズ' : 'Mastered phrases'}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {settings.masteredIds.length}{ja ? ' 件' : ' phrases'}
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

        {/* チュートリアル・ヒント */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {ja ? 'チュートリアル・ヒント' : 'Tutorial & Hints'}
          </h2>
          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-2">
            <button
              onClick={handleResetTutorial}
              className="w-full py-2.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 text-sm font-medium hover:bg-white/10 transition-colors text-left px-3"
            >
              🎓 {ja ? 'チュートリアルと操作ヒントを再表示' : 'Show tutorial & hints again'}
            </button>
            <button
              onClick={handleResetAnnouncements}
              className="w-full py-2.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 text-sm font-medium hover:bg-white/10 transition-colors text-left px-3"
            >
              🔔 {ja ? `お知らせを未読にリセット` : 'Mark all announcements unread'}
              {unreadCount > 0 && (
                <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">
                  {ja ? `${unreadCount}件未読` : `${unreadCount} unread`}
                </span>
              )}
            </button>
          </div>
        </section>

        {/* サービス情報 */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {ja ? 'サービス情報' : 'About'}
          </h2>
          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
            <p className="text-xs text-slate-500">
              {ja ? 'アップデート情報はXでお知らせしています。' : 'Follow us on X for updates.'}
            </p>
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-2 px-4 rounded-lg border border-white/10 bg-white/5 text-slate-300 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <span className="font-bold text-base">𝕏</span>
              {ja ? 'フォローする' : 'Follow on X'}
            </a>
          </div>
        </section>

        {/* アカウント */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {ja ? 'アカウント' : 'Account'}
          </h2>
          <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
            {user?.email && (
              <p className="text-xs text-slate-500 break-all">{user.email}</p>
            )}
            <button
              onClick={handleExport}
              className="w-full py-2.5 rounded-lg border border-white/10 bg-white/5 text-slate-300 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              {ja ? 'データをエクスポート (JSON)' : 'Export my data (JSON)'}
            </button>
            <button
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
            >
              {ja ? 'ログアウト' : 'Sign out'}
            </button>
            <div className="border-t border-white/5 pt-3 space-y-2">
              <p className="text-xs text-slate-600">
                {ja ? 'アカウントを削除するとすべてのデータが完全に消去されます。' : 'Deleting your account permanently removes all your data.'}
              </p>
              <p className="text-xs text-slate-500">
                {ja ? '確認のため「削除する」と入力してください' : 'Type "削除する" to confirm deletion'}
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="削除する"
                style={{ fontSize: '16px' }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-colors"
              />
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteInput !== '削除する'}
                className="w-full py-2.5 rounded-lg border border-red-600/40 bg-red-600/10 text-red-400 text-sm font-medium hover:bg-red-600/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {deleting
                  ? (ja ? '削除中...' : 'Deleting...')
                  : (ja ? 'アカウントを完全に削除する' : 'Permanently delete account')}
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
