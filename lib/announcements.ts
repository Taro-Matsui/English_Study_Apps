export interface Announcement {
  id: string        // 新IDを追加すると全ユーザーに未読として通知される
  date: string      // YYYY-MM-DD
  title: string
  body: string
  type: 'update' | 'info'
}

// ────────────────────────────────────────────
// お知らせを追加するには、配列の先頭に追記してください。
// id は一意の文字列にしてください。
// ────────────────────────────────────────────
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '2026-03-20-demo-paste',
    date: '2026-03-20',
    type: 'update',
    title: 'デモモード・テキスト貼り付け機能を追加',
    body: 'ログイン不要でクイズ体験とフレーズ抽出を試せるデモモードと、テキストを直接貼り付けてフレーズを抽出するモードを追加しました。友人に共有してみましょう！',
  },
]
