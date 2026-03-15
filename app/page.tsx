import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Engineer English</h1>
          <p className="text-gray-500 mt-2 text-sm">
            エンジニア文脈の英語フレーズを習得する
          </p>
        </div>

        <div className="grid gap-3">
          <Link
            href="/phrases"
            className="block rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="text-lg font-semibold text-gray-900">📚 フレーズ一覧</div>
            <div className="text-sm text-gray-500 mt-1">登録済みフレーズを検索・確認</div>
          </Link>

          <Link
            href="/quiz"
            className="block rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-green-300 hover:shadow-sm transition-all"
          >
            <div className="text-lg font-semibold text-gray-900">🎯 クイズ</div>
            <div className="text-sm text-gray-500 mt-1">フレーズの意味を答えて学習する</div>
          </Link>

          <Link
            href="/admin/import"
            className="block rounded-xl border border-gray-200 bg-white p-5 text-left hover:border-gray-300 hover:shadow-sm transition-all"
          >
            <div className="text-lg font-semibold text-gray-900">⚙️ インポート</div>
            <div className="text-sm text-gray-500 mt-1">字幕・テキストからフレーズを一括登録</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
