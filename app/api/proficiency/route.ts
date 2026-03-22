import { NextRequest, NextResponse } from 'next/server'

export interface ProficiencyQuestion {
  id: string
  text: string       // English phrase to identify
  options: string[]  // 4 Japanese options
  correct: number    // index of correct option (0-3)
}

// ── 共通5問（全 purpose に出題）──────────────────────────────
// 易〜中の段階的構成。仕事でよく耳にするが、直訳すると意味が変わる表現を中心に。
const GENERAL_QUESTIONS: ProficiencyQuestion[] = [
  {
    // 易: 日常的に使われ、直感でも分かりやすい
    id: 'g1',
    text: '"I\'ll get back to you on that."',
    options: ['後で改めてご連絡します', '今すぐ確認します', 'それはお断りします', 'あなたに代わりに対応します'],
    correct: 0,
  },
  {
    // 易: "same page" の比喩的意味を問う
    id: 'g2',
    text: '"Are we on the same page?"',
    options: ['同じドキュメントを見ていますか', '認識は合っていますか', '同じ立場ですか', '同じ方向に進んでいますか'],
    correct: 1,
  },
  {
    // 中: "offline" がビジネスで持つ独特の意味
    id: 'g3',
    text: '"Let\'s take this conversation offline."',
    options: ['オフラインで作業しましょう', '記録に残さず進めましょう', 'この話はミーティング後に個別に話しましょう', 'ネット接続なしで対応しましょう'],
    correct: 2,
  },
  {
    // 中: "loop in" はメール文化では必須だが、直訳では分かりにくい
    id: 'g4',
    text: '"Can you loop in the design team?"',
    options: ['デザインチームにループを作ってもらえますか', 'デザインチームを輪に入れてもらえますか', 'デザインチームにも共有・参加してもらえますか', 'デザインチームの意見を無視してもらえますか'],
    correct: 2,
  },
  {
    // 難: 直訳するとまったく違う意味になるイディオム
    id: 'g5',
    text: '"Let\'s put a pin in it for now."',
    options: ['今すぐ確定させましょう', 'この話題は一旦保留にしましょう', '詳細を資料にまとめましょう', '重要事項としてマークしましょう'],
    correct: 1,
  },
]

// ── purpose 別 5問 ────────────────────────────────────────────
const PURPOSE_QUESTIONS: Record<string, ProficiencyQuestion[]> = {
  meeting: [
    {
      // 易: リモートワークで頻出
      id: 'm1',
      text: '"Can you mute yourself for a moment?"',
      options: ['少しの間ミュートにしてもらえますか', '席を外してもらえますか', '音量を上げてもらえますか', '発言を止めてもらえますか'],
      correct: 0,
    },
    {
      // 易: 会議の口火を切るフレーズ
      id: 'm2',
      text: '"Let\'s kick things off."',
      options: ['物事を蹴り飛ばしましょう', '早めに終わらせましょう', 'それでは始めましょう', '一旦中断しましょう'],
      correct: 2,
    },
    {
      // 中: "table" が「保留」を意味する英米差もあるが、ビジネスでは保留が多い
      id: 'm3',
      text: '"Let\'s table that for now."',
      options: ['テーブルに置きましょう', 'この件は一旦保留にしましょう', '次のアジェンダに移りましょう', '全員で議論しましょう'],
      correct: 1,
    },
    {
      // 中: "recap" はビジネスメールで頻出
      id: 'm4',
      text: '"Could you send a quick recap?"',
      options: ['録画を送ってもらえますか', '返信を送ってもらえますか', '簡単なまとめ・要約を送ってもらえますか', '次回の予定を送ってもらえますか'],
      correct: 2,
    },
    {
      // 難: "bandwidth" を人的リソースの意味で使う
      id: 'm5',
      text: '"Do you have the bandwidth to take this on?"',
      options: ['インターネット速度は十分ですか', 'この会議室は使えますか', 'これを引き受ける余裕（時間・リソース）はありますか', 'この案件に詳しいですか'],
      correct: 2,
    },
  ],
  review: [
    {
      // 易: コードレビューでは必須の略語
      id: 'r1',
      text: '"LGTM" (コードレビューで使われる略語)',
      options: ['後で詳しく確認します', '承認します・問題なさそうです', 'もっと修正が必要です', 'ログを確認してください'],
      correct: 1,
    },
    {
      // 易: "Nit" は軽微な指摘を表す
      id: 'r2',
      text: '"Nit: this variable name could be clearer."',
      options: ['重大なバグ：変数名を修正してください', '些細な指摘：変数名をもう少し分かりやすくできそうです', '削除してください：変数名が間違っています', 'マージ不可：変数名が規約違反です'],
      correct: 1,
    },
    {
      // 中: "breaking change" は後方互換性の文脈
      id: 'r3',
      text: '"This is a breaking change."',
      options: ['これは大きな変更です', 'これは壊れているコードです', 'これは後方互換性を壊す変更です', 'これは破棄すべき変更です'],
      correct: 2,
    },
    {
      // 中: "follow-up PR" はよく使われる開発フロー用語
      id: 'r4',
      text: '"Let\'s address this in a follow-up PR."',
      options: ['次のスプリントで対応しましょう', 'このPRで全て対応しましょう', '後続のPRで対応しましょう', 'このPRをクローズしましょう'],
      correct: 2,
    },
    {
      // 難: "tech debt" を文脈で判断する
      id: 'r5',
      text: '"We\'re accruing a lot of tech debt here."',
      options: ['ここで多くの技術費用が発生しています', 'ここで技術的負債が積み上がっています', 'ここに技術チームが集まっています', 'ここで多くの技術的改善が行われています'],
      correct: 1,
    },
  ],
  reading: [
    {
      // 易: 技術文書の頻出語
      id: 'rd1',
      text: '"This API is deprecated."',
      options: ['このAPIは推奨されます', 'このAPIは非推奨・廃止予定です', 'このAPIは最新バージョンです', 'このAPIは必須です'],
      correct: 1,
    },
    {
      // 易: 説明文の書き出しで頻出
      id: 'rd2',
      text: '"At a high level, this system works as follows."',
      options: ['高いレベルでは、このシステムは以下のように動作します', '詳細には、このシステムは以下のように動作します', '概要として、このシステムは以下のように動作します', '最高水準で、このシステムは以下のように動作します'],
      correct: 2,
    },
    {
      // 中: "caveat" は注意書きの文脈
      id: 'rd3',
      text: '"There is one caveat to this approach."',
      options: ['このアプローチには利点が一つあります', 'このアプローチには一つ注意点・但し書きがあります', 'このアプローチには代替案が一つあります', 'このアプローチには欠点はありません'],
      correct: 1,
    },
    {
      // 中: "out of scope" は仕様書・要件定義で頻出
      id: 'rd4',
      text: '"This feature is out of scope for this release."',
      options: ['この機能はこのリリースの対象外です', 'この機能はこのリリースで必須です', 'この機能はこのリリースで範囲を超えています', 'この機能はこのリリースに含まれています'],
      correct: 0,
    },
    {
      // 難: "idiomatic" は言語・コードの文脈で使われる
      id: 'rd5',
      text: '"This is not idiomatic Python."',
      options: ['これはPythonのイディオム（慣用句）ではありません', 'これはPythonらしい自然な書き方ではありません', 'これはPythonで動作しません', 'これはPythonの標準ライブラリではありません'],
      correct: 1,
    },
  ],
  interview: [
    {
      // 易: 面接で必ず問われる
      id: 'i1',
      text: '"Tell me about yourself."',
      options: ['あなたについて教えてください', '自分自身を評価してください', '自己紹介してください', '過去の経験を教えてください'],
      correct: 0,
    },
    {
      // 易: 面接の締めくくりで必ず聞かれる
      id: 'i2',
      text: '"Do you have any questions for us?"',
      options: ['何か問題がありますか', '私たちへの質問はありますか', '確認事項はありますか', '何か懸念点はありますか'],
      correct: 1,
    },
    {
      // 中: "walk through" は説明を求めるニュアンス
      id: 'i3',
      text: '"Could you walk me through your decision-making process?"',
      options: ['意思決定プロセスを一緒に歩きましょうか', '意思決定プロセスについて順を追って説明してもらえますか', '意思決定プロセスを書き出してもらえますか', '意思決定プロセスを簡潔にまとめてもらえますか'],
      correct: 1,
    },
    {
      // 中: 行動面接の典型的な質問
      id: 'i4',
      text: '"How do you prioritize when everything feels urgent?"',
      options: ['全てが緊急に感じるとき、どのように対処しますか', '全てが緊急に感じるとき、どのように優先順位をつけますか', '全てが緊急に感じるとき、誰に相談しますか', '全てが緊急に感じるとき、どのように断りますか'],
      correct: 1,
    },
    {
      // 難: "ambiguity" は文脈によって訳し方が変わる
      id: 'i5',
      text: '"How do you deal with ambiguity?"',
      options: ['曖昧さ・不確実な状況にどう対処しますか', 'あいまいな指示をどう明確にしますか', '難しい上司とどう向き合いますか', '状況が不確かなときにどう決断しますか'],
      correct: 0,
    },
  ],
  general: [
    {
      // 易: ビジネスでよく耳にする
      id: 'ge1',
      text: '"Low-hanging fruit"',
      options: ['品質の低い成果物', '労力の割に効果の少ないもの', '手軽に達成できる目標・すぐに成果が出るもの', '収穫できないもの'],
      correct: 2,
    },
    {
      // 易: 主体的な取り組みを表す
      id: 'ge2',
      text: '"Take ownership of this project."',
      options: ['このプロジェクトの所有権を取得する', 'このプロジェクトを主体的に責任を持って進める', 'このプロジェクトを引き継ぐ', 'このプロジェクトのオーナーに連絡する'],
      correct: 1,
    },
    {
      // 中: "move the needle" は成果・変化を生む意味
      id: 'ge3',
      text: '"This initiative will move the needle."',
      options: ['この取り組みは針を動かします', 'この取り組みで状況が改善・成果が生まれます', 'この取り組みは指標を変えます', 'この取り組みで方向性が変わります'],
      correct: 1,
    },
    {
      // 中: "leverage" を動詞で使う場面
      id: 'ge4',
      text: '"We should leverage our existing data."',
      options: ['既存のデータを廃棄すべきです', '既存のデータを別の形式に変換すべきです', '既存のデータをうまく活用すべきです', '既存のデータを守るべきです'],
      correct: 2,
    },
    {
      // 難: 不可能な大仕事を試みるときに使う皮肉的なイディオム
      id: 'ge5',
      text: '"We don\'t want to boil the ocean here."',
      options: ['ここで大げさなことは避けたい', 'ここで過度に大規模な取り組みはしたくない', 'ここで全員の意見を聞くことはできない', 'ここで時間をかけすぎたくない'],
      correct: 1,
    },
  ],
}

export async function GET(req: NextRequest) {
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
