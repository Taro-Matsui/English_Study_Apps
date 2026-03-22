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
export const ANNOUNCEMENTS: Announcement[] = []
