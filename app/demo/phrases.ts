export interface DemoPhrase {
  id: string
  phrase: string
  meaning_ja: string
  difficulty: number
  usage_scene: 'daily' | 'technical' | 'business' | 'other'
  engineer_level: 'junior' | 'mid' | 'senior'
}

export const DEMO_PHRASES: DemoPhrase[] = [
  { id: 'd01', phrase: 'pull request', meaning_ja: 'コードの変更を本流ブランチにマージするよう依頼する仕組み', difficulty: 1, usage_scene: 'technical', engineer_level: 'junior' },
  { id: 'd02', phrase: 'LGTM', meaning_ja: 'Looks Good To Me — コードレビューで「問題なし」を示す略語', difficulty: 1, usage_scene: 'technical', engineer_level: 'junior' },
  { id: 'd03', phrase: 'refactoring', meaning_ja: '動作を変えずにコードの内部構造を改善すること', difficulty: 1, usage_scene: 'technical', engineer_level: 'junior' },
  { id: 'd04', phrase: 'edge case', meaning_ja: '通常とは異なる極端な条件・境界値のケース', difficulty: 2, usage_scene: 'technical', engineer_level: 'junior' },
  { id: 'd05', phrase: 'workaround', meaning_ja: '根本解決ではなく問題を回避するための一時的な対処法', difficulty: 2, usage_scene: 'daily', engineer_level: 'junior' },
  { id: 'd06', phrase: 'bottleneck', meaning_ja: '処理全体のスピードを制限している箇所・原因', difficulty: 2, usage_scene: 'technical', engineer_level: 'junior' },
  { id: 'd07', phrase: 'breaking change', meaning_ja: '既存のAPIや動作との互換性を壊す変更', difficulty: 3, usage_scene: 'technical', engineer_level: 'mid' },
  { id: 'd08', phrase: 'take ownership', meaning_ja: '責任を持って担当する・主体的に取り組む', difficulty: 3, usage_scene: 'business', engineer_level: 'mid' },
  { id: 'd09', phrase: 'spike', meaning_ja: '技術調査・試作のために時間を割り当てる短期タスク', difficulty: 3, usage_scene: 'technical', engineer_level: 'mid' },
  { id: 'd10', phrase: 'out of scope', meaning_ja: '対象範囲外・この案件では扱わない', difficulty: 2, usage_scene: 'business', engineer_level: 'junior' },
  { id: 'd11', phrase: 'ship it', meaning_ja: 'リリースする・本番に出す（口語的な表現）', difficulty: 2, usage_scene: 'daily', engineer_level: 'junior' },
  { id: 'd12', phrase: 'greenfield', meaning_ja: '既存のしがらみがない新規プロジェクト・まっさらな状態', difficulty: 3, usage_scene: 'technical', engineer_level: 'mid' },
  { id: 'd13', phrase: 'on the same page', meaning_ja: '同じ認識を持っている・共通理解がある状態', difficulty: 2, usage_scene: 'business', engineer_level: 'junior' },
  { id: 'd14', phrase: 'action item', meaning_ja: '会議などで決定した具体的な実施事項・TODO', difficulty: 2, usage_scene: 'business', engineer_level: 'junior' },
  { id: 'd15', phrase: 'pain point', meaning_ja: 'ユーザーや開発者が感じている不満・課題点', difficulty: 2, usage_scene: 'business', engineer_level: 'junior' },
  { id: 'd16', phrase: 'bandwidth', meaning_ja: '（転じて）余裕・キャパシティ（例: I don\'t have bandwidth）', difficulty: 3, usage_scene: 'daily', engineer_level: 'mid' },
  { id: 'd17', phrase: 'deliverable', meaning_ja: '成果物・納品物・具体的に提出すべきもの', difficulty: 3, usage_scene: 'business', engineer_level: 'mid' },
  { id: 'd18', phrase: 'escalate', meaning_ja: '上位層・別チームに問題を引き上げて対応を求める', difficulty: 3, usage_scene: 'business', engineer_level: 'mid' },
  { id: 'd19', phrase: 'blocker', meaning_ja: '作業を前進できなくさせている障害・問題', difficulty: 2, usage_scene: 'daily', engineer_level: 'junior' },
  { id: 'd20', phrase: 'tech debt', meaning_ja: '将来的な問題につながる技術的な負債（近道した実装の積み重ね）', difficulty: 3, usage_scene: 'technical', engineer_level: 'mid' },
]
