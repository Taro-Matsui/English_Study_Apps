import Link from 'next/link'
import { X_URL } from '@/lib/social'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-ground flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">

        {/* ヘッダー */}
        <div className="text-center space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pick_logo.png" alt="Pick" className="w-16 h-16 rounded-2xl mx-auto" />
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pick</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            会話からフレーズをピックして学ぶアプリを<br />
            <span className="text-brand font-semibold">ログインなし</span>で体験できます
          </p>
          <div className="inline-flex items-center gap-1.5 bg-amber-100 border border-line rounded-full px-3 py-1 text-xs text-amber-800">
            <span>⚡</span>
            <span>デモモード — データは保存されません</span>
          </div>
        </div>

        {/* 体験カード */}
        <div className="space-y-3">
          <Link
            href="/demo/quiz"
            className="block w-full rounded-2xl bg-white border border-line shadow-sm hover:bg-ground/60 transition-colors p-5 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">🎯</div>
              <div>
                <p className="font-bold text-gray-900 text-lg">チャレンジ体験</p>
                <p className="text-gray-500 text-sm mt-0.5">
                  よく使う20フレーズからランダム10問。AI が回答を判定します。
                </p>
              </div>
              <span className="ml-auto text-brand text-xl">→</span>
            </div>
          </Link>

          <Link
            href="/demo/import"
            className="block w-full rounded-2xl bg-white border border-line shadow-sm hover:bg-ground/60 transition-colors p-5 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="text-3xl">🎸</div>
              <div>
                <p className="font-bold text-gray-900 text-lg">ピック体験</p>
                <p className="text-gray-500 text-sm mt-0.5">
                  英語テキストを貼り付けると、AI がフレーズを自動抽出します。
                </p>
              </div>
              <span className="ml-auto text-brand text-xl">→</span>
            </div>
          </Link>
        </div>

        {/* 区切り */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-amber-200" />
          <span className="text-xs text-gray-400">すべての機能を使うには</span>
          <div className="flex-1 h-px bg-amber-200" />
        </div>

        {/* 登録・ログイン */}
        <div className="space-y-2">
          <Link
            href="/login"
            className="block w-full rounded-xl bg-brand hover:bg-brand-deep transition-colors px-4 py-3 text-center text-sm font-bold text-white"
          >
            無料アカウント登録 / ログイン
          </Link>
          <p className="text-center text-xs text-gray-400">
            登録するとチャレンジ記録の保存・自分のSourceのピックが可能になります
          </p>
        </div>

        {/* フッター */}
        <div className="flex justify-center items-center gap-4 pt-2">
          <Link href="/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            ログイン / 新規登録
          </Link>
          <span className="text-gray-300">·</span>
          <a
            href={X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            𝕏 フォロー
          </a>
        </div>

      </div>
    </div>
  )
}
