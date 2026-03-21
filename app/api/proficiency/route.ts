import { NextRequest, NextResponse } from 'next/server'

export interface ProficiencyQuestion {
  id: string
  text: string       // English phrase to identify
  options: string[]  // 4 Japanese options
  correct: number    // index of correct option (0-3)
}

// ── 共通5問（全 purpose に出題）──────────────────────────────
const GENERAL_QUESTIONS: ProficiencyQuestion[] = [
  {
    id: 'g1',
    text: '"Could you give me a heads-up?"',
    options: ['事前に知らせてもらえますか', 'まとめてもらえますか', '急いでもらえますか', '正直に言ってもらえますか'],
    correct: 0,
  },
  {
    id: 'g2',
    text: '"Let\'s touch base tomorrow."',
    options: ['明日また連絡を取りましょう', '明日基地に集まりましょう', '明日タッチダウンしましょう', '明日の予定を組みましょう'],
    correct: 0,
  },
  {
    id: 'g3',
    text: '"We\'re on the same page."',
    options: ['私たちは同じページを見ている', '私たちは同じ認識でいる', '私たちは同じ立場にある', '私たちは同じ目標を持っている'],
    correct: 1,
  },
  {
    id: 'g4',
    text: '"Can you loop me in?"',
    options: ['私をループに入れてください', '私もCCに入れてください', '私に説明してください', '私を巻き込まないでください'],
    correct: 1,
  },
  {
    id: 'g5',
    text: '"Let\'s circle back on this later."',
    options: ['この件を円滑に進めましょう', 'この件に戻ってください', 'この件はあとで改めて話しましょう', 'この件を振り返りましょう'],
    correct: 2,
  },
]

// ── purpose 別 5問 ────────────────────────────────────────────
const PURPOSE_QUESTIONS: Record<string, ProficiencyQuestion[]> = {
  meeting: [
    {
      id: 'm1',
      text: '"Can you share your screen?"',
      options: ['画面を共有してもらえますか', 'スクリーンを見せてもらえますか', 'モニターを準備してもらえますか', '画像を送ってもらえますか'],
      correct: 0,
    },
    {
      id: 'm2',
      text: '"Let\'s table this for now."',
      options: ['これをテーブルに置きましょう', 'これを先に進めましょう', 'これは一旦保留にしましょう', 'これは重要ではありません'],
      correct: 2,
    },
    {
      id: 'm3',
      text: '"Can you take notes?"',
      options: ['メモを受け取れますか', '議事録を取ってもらえますか', 'ノートを持ってきてもらえますか', '記録を確認してもらえますか'],
      correct: 1,
    },
    {
      id: 'm4',
      text: '"Let\'s wrap up."',
      options: ['ラップを食べましょう', '包んで送りましょう', 'まとめて送りましょう', 'そろそろ終わりにしましょう'],
      correct: 3,
    },
    {
      id: 'm5',
      text: '"Who\'s facilitating today?"',
      options: ['今日の進行役は誰ですか', '今日の参加者は誰ですか', '今日のファシリティはどこですか', '今日誰が発言しますか'],
      correct: 0,
    },
  ],
  review: [
    {
      id: 'r1',
      text: '"LGTM"',
      options: ['後で確認します', '承認します・問題ありません', '修正が必要です', 'もう少し詳しく説明してください'],
      correct: 1,
    },
    {
      id: 'r2',
      text: '"This is a breaking change."',
      options: ['これは大きな変更です', 'これは壊れています', 'これは後方互換性を壊す変更です', 'これは休憩が必要な変更です'],
      correct: 2,
    },
    {
      id: 'r3',
      text: '"Nit:" (コードレビューコメントの接頭辞)',
      options: ['重大なバグです', 'マージできません', '些細な指摘です', '削除してください'],
      correct: 2,
    },
    {
      id: 'r4',
      text: '"Let\'s address this in a follow-up PR."',
      options: ['後続のPRで対応しましょう', 'このPRを閉じましょう', '別の方法で対処しましょう', 'このPRをフォローしてください'],
      correct: 0,
    },
    {
      id: 'r5',
      text: '"Could you add a test for this?"',
      options: ['テストを追加してもらえますか', 'テストを削除してもらえますか', 'テストを確認してもらえますか', 'テストを送ってもらえますか'],
      correct: 0,
    },
  ],
  reading: [
    {
      id: 'rd1',
      text: '"deprecated"',
      options: ['推奨される', '非推奨・廃止予定', '最新バージョン', '必須の'],
      correct: 1,
    },
    {
      id: 'rd2',
      text: '"prerequisite"',
      options: ['後から必要なもの', 'オプションの要件', '前提条件・事前に必要なもの', '代替手段'],
      correct: 2,
    },
    {
      id: 'rd3',
      text: '"At a high level"',
      options: ['高い場所から', '詳細に・細かく', '概要として・大まかに', '上位レベルで修正する'],
      correct: 2,
    },
    {
      id: 'rd4',
      text: '"by default"',
      options: ['例外的に', '手動で設定すると', 'デフォルトで・初期設定では', '常に'],
      correct: 2,
    },
    {
      id: 'rd5',
      text: '"This is out of scope."',
      options: ['これはスコープを超えています', 'これは対象外です', 'これは範囲内です', 'これは範囲を広げます'],
      correct: 1,
    },
  ],
  interview: [
    {
      id: 'i1',
      text: '"Could you walk me through your experience?"',
      options: ['あなたの経験について説明してもらえますか', '私を案内してもらえますか', '私の経験を聞いてもらえますか', '一緒に歩きましょうか'],
      correct: 0,
    },
    {
      id: 'i2',
      text: '"I\'d like to clarify..."',
      options: ['私は明確にしたいのですが', '私はキャリアを積みたいのですが', '私は説明したくないのですが', '私はクリアしたいのですが'],
      correct: 0,
    },
    {
      id: 'i3',
      text: '"I\'m particularly interested in..."',
      options: ['私は特に興味を持っていないのですが', '私は特に興味を持っているのが～です', '私は部分的に興味があるのが～です', '私が気になるのは～ではありません'],
      correct: 1,
    },
    {
      id: 'i4',
      text: '"What\'s your greatest strength?"',
      options: ['あなたの最大の弱点は何ですか', 'あなたはどのくらい強いですか', 'あなたの最大の強みは何ですか', 'あなたが最も苦労したことは何ですか'],
      correct: 2,
    },
    {
      id: 'i5',
      text: '"Do you have any questions for us?"',
      options: ['私たちへの質問はありますか', '私たちに何か質問してもいいですか', '私たちの質問に答えられますか', '私たちは質問がありますか'],
      correct: 0,
    },
  ],
  general: [
    {
      id: 'ge1',
      text: '"Take ownership"',
      options: ['所有権を取る', '主体的に責任を持って取り組む', '仕事を引き継ぐ', 'オーナーに頼む'],
      correct: 1,
    },
    {
      id: 'ge2',
      text: '"Low-hanging fruit"',
      options: ['品質の低いもの', '労力の割に効果が少ないもの', '簡単に達成できる目標', '収穫できないもの'],
      correct: 2,
    },
    {
      id: 'ge3',
      text: '"Bandwidth" (ビジネス文脈)',
      options: ['インターネット速度', '時間的余裕・処理能力', '帯域幅の計測値', '周波数帯域'],
      correct: 1,
    },
    {
      id: 'ge4',
      text: '"Move the needle"',
      options: ['針を動かす', '方針を変える', '状況を改善する・成果を出す', '測定値を記録する'],
      correct: 2,
    },
    {
      id: 'ge5',
      text: '"Leverage" (動詞)',
      options: ['持ち上げる', '反論する', '破棄する', '活用する・うまく利用する'],
      correct: 3,
    },
  ],
}

export async function GET(req: NextRequest) {
  // 認証不要（ゲストでも見せる）— ただし乱用防止のため一応確認
  const { searchParams } = new URL(req.url)
  const purpose = searchParams.get('purpose') ?? 'general'

  const purposeQuestions =
    PURPOSE_QUESTIONS[purpose] ?? PURPOSE_QUESTIONS['general']

  const questions: ProficiencyQuestion[] = [
    ...GENERAL_QUESTIONS,
    ...purposeQuestions,
  ]

  return NextResponse.json({ questions })
}
