import Link from 'next/link'

export const metadata = {
  title: '利用規約 | Pick',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ground py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">← トップへ戻る</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">利用規約</h1>
          <p className="text-sm text-gray-500 mt-1">最終更新日：2025年6月1日</p>
        </div>

        <div className="bg-white rounded-2xl border border-line shadow-sm p-6 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">1. サービスの概要</h2>
            <p>
              「Pick」（以下「当サービス」）は、ユーザーが提供する英語テキストからフレーズをAIで抽出し、
              クイズ形式で学習できる英語学習サービスです。
              本規約はユーザーと運営者との間に適用されます。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">2. 利用資格</h2>
            <p>当サービスは13歳以上の方を対象としています。未成年者は保護者の同意を得た上でご利用ください。</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">3. アカウント</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
              <li>ユーザーはアカウント情報を正確に保ち、パスワードを安全に管理する責任を負います。</li>
              <li>第三者への譲渡・共有は禁止します。</li>
              <li>不正利用が疑われる場合、予告なくアカウントを停止する場合があります。</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">4. 禁止事項</h2>
            <p>以下の行為を禁止します。</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
              <li>法令または公序良俗に違反する行為</li>
              <li>第三者の著作権・プライバシー・個人情報を侵害するコンテンツのインポート</li>
              <li>サービスへの不正アクセス・リバースエンジニアリング</li>
              <li>スパム・自動化スクリプトによる大量アクセス</li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">5. コンテンツの権利</h2>
            <p>
              ユーザーがインポートしたテキストの権利はユーザーまたは原著作者に帰属します。
              当サービスはサービス提供の目的に限りこれを処理します。
              AIが生成したフレーズ解説・フィードバックは当サービスの提供物として取り扱います。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">6. 免責事項</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
              <li>AIによる抽出・採点結果の正確性を保証するものではありません。</li>
              <li>サービスの中断・データ損失に伴う損害について、運営者は責任を負いません。</li>
              <li>当サービスを通じて学習した内容の効果を保証するものではありません。</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">7. サービスの変更・終了</h2>
            <p>
              運営者は予告なくサービスの内容を変更、または提供を終了する場合があります。
              終了の際は可能な範囲で事前にお知らせします。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">8. 規約の変更</h2>
            <p>
              本規約は必要に応じて変更されます。重要な変更はサービス内でお知らせします。
              変更後も当サービスを継続して利用することで、変更後の規約に同意したものとみなします。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">9. 準拠法・管轄</h2>
            <p>本規約は日本法に準拠し、紛争は運営者の所在地を管轄する裁判所を第一審の専属的合意管轄とします。</p>
          </section>

        </div>

        <div className="flex justify-center gap-6 text-xs text-gray-400 pb-6">
          <Link href="/privacy" className="hover:text-gray-600">プライバシーポリシー</Link>
          <Link href="/about" className="hover:text-gray-600">運営者情報</Link>
          <Link href="/contact" className="hover:text-gray-600">お問い合わせ</Link>
        </div>
      </div>
    </div>
  )
}
