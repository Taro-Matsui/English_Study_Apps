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
    id: '2026-03-22-rebrand',
    date: '2026-03-22',
    type: 'update',
    title: 'Reel がリブランドしました 🎸',
    body: 'アプリ全体のブランドを「Pick」コンセプトに統一しました。クイズは「プラクティス」、記録は「記録」、フレーズ一覧は「マイ ピック」と名称が変わっています。引き続きよろしくお願いします！',
  },
]
