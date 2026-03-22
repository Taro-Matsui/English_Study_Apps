import Link from 'next/link'

export const metadata = {
  title: 'プライバシーポリシー | Reel',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-amber-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <Link href="/login" className="text-sm text-amber-700 hover:text-amber-900">← トップへ戻る</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">プライバシーポリシー</h1>
          <p className="text-sm text-gray-500 mt-1">最終更新日：2025年6月1日</p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">1. 事業者情報</h2>
            <p>本サービス「Reel」（以下「当サービス」）は、個人が運営するウェブアプリケーションです。</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">2. 収集する情報</h2>
            <p>当サービスでは、以下の情報を収集します。</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
              <li>メールアドレス（アカウント登録・ログイン用）</li>
              <li>学習目的・レベルなどの学習設定（オンボーディング時に入力）</li>
              <li>インポートしたテキストおよびAIが抽出した英語フレーズ</li>
              <li>クイズの回答履歴・正解率・回答速度</li>
              <li>アクセスログ（IPアドレス、ブラウザ種別、ページ閲覧履歴など）</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">3. 利用目的</h2>
            <p>収集した情報は以下の目的で利用します。</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
              <li>サービスの提供・運営・改善</li>
              <li>ユーザーへの学習フィードバックの提供</li>
              <li>不正利用の防止およびセキュリティの確保</li>
              <li>利用状況の分析（匿名化した統計として使用）</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">4. 第三者サービスへの提供</h2>
            <p>当サービスは以下の第三者サービスを利用しており、それぞれのプライバシーポリシーが適用されます。</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 pl-2">
              <li>
                <span className="font-medium">Supabase</span>（認証・データベース）—
                ユーザーアカウント情報および学習データを保管します。
              </li>
              <li>
                <span className="font-medium">Anthropic Claude API</span>（AI処理）—
                フレーズ抽出・クイズ採点のためにテキストを送信します。送信データはAnthropicのプライバシーポリシーに従い処理されます。
              </li>
              <li>
                <span className="font-medium">Google Analytics / Google Tag Manager</span>—
                サイトのアクセス解析に使用します。
              </li>
              <li>
                <span className="font-medium">Google AdSense</span>—
                広告配信に使用します。Cookieを利用してパーソナライズ広告が表示される場合があります。
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">5. Cookieの使用</h2>
            <p>
              当サービスはセッション管理およびアクセス解析・広告配信のためにCookieを使用します。
              ブラウザの設定によりCookieを無効化することができますが、一部機能が正常に動作しなくなる場合があります。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">6. データの保管・削除</h2>
            <p>
              ユーザーデータはサービスの提供に必要な期間保管します。
              アカウントの削除をご希望の場合は、お問い合わせページよりご連絡ください。
              受領後、合理的な期間内にデータを削除します。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">7. 未成年者の利用</h2>
            <p>当サービスは13歳未満のお子様を対象としていません。</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">8. ポリシーの変更</h2>
            <p>
              本ポリシーは予告なく変更する場合があります。重要な変更がある場合はサービス内でお知らせします。
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-gray-900 text-base">9. お問い合わせ</h2>
            <p>
              プライバシーに関するお問い合わせは
              <Link href="/contact" className="text-amber-700 hover:underline ml-1">こちら</Link>
              からご連絡ください。
            </p>
          </section>
        </div>

        <div className="flex justify-center gap-6 text-xs text-gray-400 pb-6">
          <Link href="/terms" className="hover:text-gray-600">利用規約</Link>
          <Link href="/about" className="hover:text-gray-600">運営者情報</Link>
          <Link href="/contact" className="hover:text-gray-600">お問い合わせ</Link>
        </div>
      </div>
    </div>
  )
}
