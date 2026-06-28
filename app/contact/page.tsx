import Link from 'next/link'

export const metadata = {
  title: 'お問い合わせ | Pick',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-ground py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href="/login" className="text-sm text-amber-700 hover:text-amber-900">← トップへ戻る</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">お問い合わせ</h1>
        </div>

        <div className="bg-white rounded-2xl border border-line shadow-sm p-6 space-y-5 text-sm text-gray-700 leading-relaxed">

          <p>
            サービスに関するご質問・ご要望・不具合のご報告・アカウント削除のご依頼は、
            下記のメールアドレスまでお気軽にお問い合わせください。
          </p>

          <div className="bg-ground rounded-xl p-4 space-y-1">
            <p className="text-xs text-amber-700 font-medium uppercase tracking-wider">連絡先</p>
            <a
              href="mailto:support@usepick.win"
              className="text-brand font-semibold hover:underline break-all"
            >
              support@usepick.win
            </a>
          </div>

          <div className="space-y-2">
            <h2 className="font-bold text-gray-900">お問い合わせの前に</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
              <li>件名に「Pickに関するお問い合わせ」とご記入ください。</li>
              <li>アカウント削除のご依頼は、登録済みのメールアドレスからご連絡ください。</li>
              <li>通常3営業日以内を目安にご返信しますが、お時間をいただく場合があります。</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="font-bold text-gray-900">対応内容</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
              <li>サービスの使い方に関するご質問</li>
              <li>不具合・バグのご報告</li>
              <li>機能改善のご提案</li>
              <li>アカウントの削除・データ削除のご依頼</li>
              <li>プライバシーに関するお問い合わせ</li>
            </ul>
          </div>

        </div>

        <div className="flex justify-center gap-6 text-xs text-gray-400 pb-6">
          <Link href="/privacy" className="hover:text-gray-600">プライバシーポリシー</Link>
          <Link href="/terms" className="hover:text-gray-600">利用規約</Link>
          <Link href="/about" className="hover:text-gray-600">運営者情報</Link>
        </div>
      </div>
    </div>
  )
}
