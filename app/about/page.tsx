import Link from 'next/link'

export const metadata = {
  title: '運営者情報 | Pick',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-amber-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href="/login" className="text-sm text-amber-700 hover:text-amber-900">← トップへ戻る</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">運営者情報</h1>
        </div>

        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 space-y-5 text-sm text-gray-700 leading-relaxed">

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 border-b border-gray-100 pb-4">
              <dt className="font-medium text-gray-500">サービス名</dt>
              <dd className="col-span-2 font-semibold text-gray-900">Pick（リール）</dd>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b border-gray-100 pb-4">
              <dt className="font-medium text-gray-500">運営者</dt>
              <dd className="col-span-2">松井 太郎</dd>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b border-gray-100 pb-4">
              <dt className="font-medium text-gray-500">サービス種別</dt>
              <dd className="col-span-2">個人運営のウェブアプリケーション</dd>
            </div>
            <div className="grid grid-cols-3 gap-4 border-b border-gray-100 pb-4">
              <dt className="font-medium text-gray-500">所在地</dt>
              <dd className="col-span-2">日本</dd>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <dt className="font-medium text-gray-500">お問い合わせ</dt>
              <dd className="col-span-2">
                <Link href="/contact" className="text-amber-700 hover:underline">
                  お問い合わせフォームへ →
                </Link>
              </dd>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5 space-y-2">
            <h2 className="font-bold text-gray-900">サービスについて</h2>
            <p>
              Pick は、実際の会話や文書から自分に必要な英語フレーズをPickして学ぶアプリです。
              議事録・YouTube字幕・技術記事などのリアルなテキストを追加すると、
              AIがあなたの学習目的に合ったフレーズを自動でPickし、Practiceで定着をサポートします。
            </p>
            <p>
              エンジニア・ビジネスパーソン・英語学習者など、
              「使える英語」を身につけたいすべての方を対象としています。
            </p>
          </div>

        </div>

        <div className="flex justify-center gap-6 text-xs text-gray-400 pb-6">
          <Link href="/privacy" className="hover:text-gray-600">プライバシーポリシー</Link>
          <Link href="/terms" className="hover:text-gray-600">利用規約</Link>
          <Link href="/contact" className="hover:text-gray-600">お問い合わせ</Link>
        </div>
      </div>
    </div>
  )
}
