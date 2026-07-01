---
name: pick-verify
description: Use when a change to Pick's authenticated screens (/library/import, /quiz, /phrases, /streak, /history, /settings, /) needs to be seen rendering in a real browser — these pages sit behind Supabase auth so a plain fetch or headless nav bounces to /login and you cannot visually confirm the change. Also use to screenshot Pick UI for review or to reproduce a logged-in UI bug. Not needed for public pages (/demo, /login, /privacy).
---

# pick-verify — Pickの認証画面を実機で見る

## Overview
Pickの主要画面は Supabase 認証ゲートの内側にあり、素のfetchやheadlessは `/login` に弾かれて中身を確認できない（本アプリ開発の恒常的な壁）。このスキルは **一度ログインしてセッションを保存 → 以後は再利用して任意ルートを開き、スクリーンショットを撮る** Playwright ハーネスを提供する。

## 前提（初回のみ）
- **確認済みのテスト用アカウント**（メール確認まで完了したもの）。新規作成は確認メールが要るため事前に用意する。
- 環境変数: `PICK_TEST_EMAIL` / `PICK_TEST_PASSWORD`。（Google OAuth は自動化不可＝メール+パスワードのアカウントを使う）
- 対象URL: `PICK_BASE_URL`（既定 `http://localhost:3000`）。ローカルは別ターミナルで `npm run dev`。本番検証は `PICK_BASE_URL=https://usepick.win`（※本番はテスト垢で実データが増える点に注意）。
- **Playwright はこのリポの依存に無い**。未導入なら先に `playwright-skill` を起動してブラウザ環境を用意する（**REQUIRED SUB-SKILL: playwright-skill**）。その環境で下記スクリプトを実行する。

## Quick Reference
```bash
# モバイル(既定 iPhone 13)で /library/import を撮る
PICK_TEST_EMAIL=you@example.com PICK_TEST_PASSWORD=*** \
  node .claude/skills/pick-verify/verify.mjs /library/import

node .claude/skills/pick-verify/verify.mjs /quiz --desktop   # PC幅
node .claude/skills/pick-verify/verify.mjs /demo --no-auth    # 公開ページ(ログイン不要)
node .claude/skills/pick-verify/verify.mjs /phrases --fresh    # 保存セッションを無視して再ログイン
```
- 出力: スクリーンショットのパス・最終URL・タイトルを標準出力に表示。
- セッションは OS の一時ディレクトリに保存し再利用（`PICK_AUTH_STATE` で変更可）。**セッションファイルとスクショはコミットしない**（tokenを含む・`.gitignore`済）。

## How it works
1. 保存済みセッションがあれば読み込んで対象ルートへ。無効/未保存なら `/login`（signinタブが既定）で email+password を入力し submit → `/` へ遷移を待ってセッション保存。
2. 目的ルートを開き `fullPage` スクショ。`/onboarding` に飛ばされたらテスト垢が未オンボーディングと警告。

## Common Mistakes
- **本番(usepick.win)で無邪気に実行**しない。ソース投入やクイズ回答は実データを作る。読み取り確認はローカル推奨。
- テスト垢が**未オンボーディング**だと `/library/import` 等が `/onboarding` に飛ぶ。先に一度オンボーディングを完了させておく。
- `npm run dev` を起動し忘れると `ECONNREFUSED`。スクリプトがその旨を表示する。
- Playwright 未導入で `Cannot find module 'playwright'` → 先に `playwright-skill` を起動。
