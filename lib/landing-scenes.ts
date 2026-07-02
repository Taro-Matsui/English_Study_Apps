// シーン別フレーズLP（プログラマティックSEO）の設定。
// 素材は lib/seed-phrases.ts の既存フレーズ（getSeedPhrases）を再利用し、追加API費用ゼロで静的生成する。
// シーン選定はエンジニア長尾に限定（汎用「ビジネス会議英語」はBerlitz/Bizmates/ALC等の巨大権威が独占＝別名義新規は勝てない）。
import type { SeedKey } from '@/lib/seed-phrases'

export interface LandingScene {
  /** URL slug（英字ケバブ）。/phrases-for/<slug> */
  slug: string
  /** 表示フレーズの取得元 seedKey */
  seedKey: SeedKey
  /** <title>（狙うクエリを含める） */
  title: string
  /** meta description */
  description: string
  /** ページ内 H1 */
  h1: string
  /** H1 直下の導入文（検索意図に答える1〜2文） */
  intro: string
}

const SCENES: Record<string, LandingScene> = {
  'code-review': {
    slug: 'code-review',
    seedKey: 'review',
    title: 'コードレビューで使う英語フレーズ集｜例文つき | Pick',
    description:
      'コードレビューやPRのやり取りで実際に使う英語フレーズを、日本語の意味と実例文つきで紹介。LGTM や nit などの略語から、やわらかく指摘する言い回しまで、現場でそのまま使える表現を集めました。',
    h1: 'コードレビューで使う英語フレーズ集',
    intro:
      'Pull Request のレビューやコメントで使う英語表現を、日本語の意味と実際の例文つきでまとめました。角を立てずに指摘する言い回しや、承認・依頼の定番フレーズを実際の会話文脈から学べます。',
  },
  'tech-conference': {
    slug: 'tech-conference',
    seedKey: 'conference',
    title: '技術カンファレンス・登壇で使う英語フレーズ集｜例文つき | Pick',
    description:
      '技術カンファレンスでの登壇・発表・質疑応答で使う英語フレーズを、日本語の意味と実例文つきで紹介。プレゼンの切り出しから質問への切り返しまで、登壇の現場で使える表現を集めました。',
    h1: '技術カンファレンス・登壇の英語フレーズ集',
    intro:
      'カンファレンスでの発表・LT・質疑応答で使う英語表現を、日本語の意味と実際の例文つきでまとめました。プレゼンの導入、デモの案内、質問への受け答えまで、登壇の場面から学べます。',
  },
  'engineer-meeting': {
    slug: 'engineer-meeting',
    seedKey: 'meeting',
    title: 'エンジニアの英語ミーティング・朝会フレーズ集｜例文つき | Pick',
    description:
      'エンジニアのデイリースクラム・朝会・1on1で使う英語フレーズを、日本語の意味と実例文つきで紹介。進捗共有やブロッカーの報告、アクションアイテムの確認まで、開発チームの会議でそのまま使える表現を集めました。',
    h1: 'エンジニアの英語ミーティング・朝会フレーズ集',
    intro:
      'デイリースクラムや朝会、開発チームの定例で使う英語表現を、日本語の意味と実際の例文つきでまとめました。進捗の共有、ブロッカーの報告、次のアクションの確認まで、実際の会議の場面から学べます。',
  },
}

export const LANDING_SCENE_SLUGS: string[] = Object.keys(SCENES)

export function getScene(slug: string): LandingScene | undefined {
  return SCENES[slug]
}
