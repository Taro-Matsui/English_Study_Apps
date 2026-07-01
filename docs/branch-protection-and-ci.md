# ブランチ運用と CI ゲート化（観点#1）

> 目的: `master` push が**無ゲートで即 Railway 本番デプロイ**される現状を解消し、
> CI（単体テスト＋型・ビルド）を**必須チェック**にして「壊れたコミットのデプロイ」を構造的に止める。

現状の CI（[.github/workflows/ci.yml](../.github/workflows/ci.yml)）は push/PR で `verify` ジョブ（`npm run test` ＋ `npm run build`、lint はアドバイザリ）を走らせる。これを**必須**にするには、GitHub と Railway の設定変更が要る（コードだけでは完結しない）。

## 新しい開発フロー

```
feature ブランチ → push → Pull Request → CI(verify) が緑 → merge → master → Railway 自動デプロイ
```

- 直接 `git push origin master` は**不可になる**（下記ブランチ保護を有効化後）。
- 手元の手順: `git switch -c feat/xxx` → 実装 → `npm run test && npm run build`（緑を確認）→ `git push -u origin feat/xxx` → GitHub で PR 作成 → CI 緑で merge。

## 手動設定①: GitHub ブランチ保護（要・あなたの操作）

リポジトリ **Taro-Matsui/English_Study_Apps** → Settings → Branches → Add branch ruleset（または Add rule）。

- **Branch name pattern**: `master`
- **Require a pull request before merging**: ON
  - **Required approvals**: `0`（ソロ運用のため人手レビューは不要。PR 経由を強制するだけ）
- **Require status checks to pass before merging**: ON
  - 検索して **`verify`** を必須チェックに追加（初回は一度 PR を作って CI を走らせると候補に出る）
  - **Require branches to be up to date before merging**: ON 推奨（古い master 上の緑を防ぐ）
- **Do not allow force pushes** / **deletions**: ON
- **Include administrators（管理者にも適用）**:
  - 真のゲートにするなら ON。ただしソロ運用では緊急時に自分でバイパスできなくなる。
  - 緊急回避を残すなら OFF（管理者＝あなたは一時的に直接 push 可能）。**推奨は当面 OFF**（回避余地を残す）。

## 手動設定②: Railway（任意・belt-and-suspenders）

`master` を保護すれば master には CI 済みコードしか入らないため必須ではないが、二重防御として:

- Railway → 該当サービス → Settings → **Wait for CI**（Check Suites 連携）を ON にすると、GitHub チェック成功までデプロイを待機する。

## ソロ運用の要点

- **approvals=0** なら他者レビュー不要で PR フローを強制できる（一人でも運用可能）。
- 必須にするのは**人ではなく CI チェック（`verify`）**。緑でなければ merge できない。
- CI が確実に緑になることを**先に**確認（PR を1本作って Actions タブで確認）してから「必須チェック」に指定する。順序を逆にすると merge が詰まる。

## 有効化後の重要な変化

- このセッションで行ってきた `git push origin master` 直接は**できなくなる**。
- すべての変更は feature ブランチ → PR 経由になる。CI（test+build）を通らないコードは master に入らない＝本番に出ない。
- lint は当面アドバイザリ（`continue-on-error`）。安定後に必須へ昇格可。
