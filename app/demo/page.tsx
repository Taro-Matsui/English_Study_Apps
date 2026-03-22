import Link from 'next/link'
import { X_URL } from '@/lib/social'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">

        {/* ヘッダー */}
        <div className="text-center space-y-3">
          <div className="text-4xl">🔤</div>
          <h1 className="text-3xl font-bold text-white">Engineer English</h1>
          <p className="text-slate-400">
            エンジニア向け英語フレーズ学習アプリを<br />
            <span className="text-emerald-400 font-semibold">ログインなし</span>で体験できます
          </p>
          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1 text-xs text-amber-400">
            <span>⚡</span>
            <span>デモモード — データは保存されません</span>
          </div>
        </div>

        {/* 体験カード */}
        <div className="space-y-3">
          <Link
            href="/demo/quiz"
            className="block w-full rounded-2xl bg-emerald-600 hover:bg-emerald-500 transition-colors p-5 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">🎯</div>
              <div>
                <p className="font-bold text-white text-lg">チャレンジ 体験</p>
                <p className="text-emerald-200 text-sm mt-0.5">
                  よく使う20フレーズからランダム10問。AI が回答を判定します。
                </p>
              </div>
              <span className="ml-auto text-emerald-200 text-xl">→</span>
            </div>
          </Link>

          <Link
            href="/demo/import"
            className="block w-full rounded-2xl bg-blue-600 hover:bg-blue-500 transition-colors p-5 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">📋</div>
              <div>
                <p className="font-bold text-white text-lg">Pick 体験</p>
                <p className="text-blue-200 text-sm mt-0.5">
                  英語テキストを貼り付けると、AI がフレーズを自動抽出します。
                </p>
              </div>
              <span className="ml-auto text-blue-200 text-xl">→</span>
            </div>
          </Link>
        </div>

        {/* 区切り */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-slate-500">すべての機能を使うには</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* 登録・ログイン */}
        <div className="space-y-2">
          <Link
            href="/login"
            className="block w-full rounded-xl bg-white/10 hover:bg-white/15 transition-colors px-4 py-3 text-center text-sm font-semibold text-white"
          >
            無料アカウント登録 / ログイン
          </Link>
          <p className="text-center text-xs text-slate-500">
            登録するとチャレンジ記録の保存・自分のSourceのピックが可能になります
          </p>
        </div>
        {/* フッター */}
        <div className="flex justify-center items-center gap-4 pt-2">
          <Link href="/login" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
            ログイン / 新規登録
          </Link>
          <span className="text-slate-700">·</span>
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            𝕏 フォロー
          </a>
        </div>

      </div>
    </div>
  )
}
