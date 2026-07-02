# Pick 市場投入 First Sprint（蛇口の配線）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 検索エンジンとXシェアから未ログイン流入が実際に着地・回遊できるよう、蛇口の配線（middleware公開登録・シーンLP静的生成・robots/sitemap・シェアCTA修復）＋登録前だけの薄い計装を一括で通す。

**Architecture:** 既存 `lib/seed-phrases.ts` の約110フレーズ（`PURPOSE_PHRASES`）を素材に、エンジニア長尾クエリ向けの静的LP群を `generateStaticParams` で生成。Claude生成パイプラインは組まない。middleware の `GUEST_PATHS` にLPプレフィックスを足して認証302を回避。robots/sitemap でクロール指針を与え、Xシェア着地の両CTAを認証不要の `/demo/*` へ向け替える。登録前ファネル4イベントのみ `window.dataLayer.push`（GTM既設）で計測。

**Tech Stack:** Next.js 14 App Router / TypeScript / Tailwind (Trusted Teal トークン) / GTM(GTM-PWNWXD23) / vitest。

**サイトURL:** `https://usepick.win`

**シーン選定（キーワード探索の結論）:** 汎用「英語 会議 フレーズ」はBerlitz/Bizmates/ALC等の巨大権威が独占するレッドオーシャンで別名義新規は勝てない。**エンジニア長尾に絞る**（巨大権威が不在で小サイトでもランク余地あり・Pickの`business_engineer`ポジションと一致）。初弾3シーン:
| slug | seedKey | 狙うクエリ | H1 |
|---|---|---|---|
| `code-review` | `review` | コードレビュー 英語 フレーズ 例文 | コードレビューで使う英語フレーズ集 |
| `tech-conference` | `conference` | カンファレンス 登壇 英語 フレーズ | 技術カンファレンス・登壇の英語フレーズ集 |
| `engineer-meeting` | `meeting` | エンジニア ミーティング 朝会 英語 | エンジニアの英語ミーティング・朝会フレーズ集 |

---

## File Structure

- **Create** `lib/landing-scenes.ts` — シーン設定の純粋モジュール（slug→{seedKey, h1, title, description, intro}）と `getScene()` / `LANDING_SCENE_SLUGS`。表示は `getSeedPhrases(seedKey)` を再利用。
- **Create** `__tests__/unit/landing-scenes.test.ts` — 設定の健全性テスト（全slugが有効SeedKeyに解決・フレーズ非空・重複slug無し・metadata長）。
- **Create** `app/phrases-for/[scene]/page.tsx` — Server Component。`generateStaticParams`（全slug）・`generateMetadata`（scene由来）・フレーズ一覧描画・CTA→`/demo/import`。未知slugは `notFound()`。
- **Create** `app/robots.ts` — 認証必須パスを Disallow・LP/demo/公開ページを Allow・sitemap 参照。
- **Create** `app/sitemap.ts` — landing・公開ページ・全シーンLP を列挙。
- **Create** `components/TrackOnMount.tsx` — Client。マウント時に1度だけ `track(event)` を発火する薄いラッパ。
- **Create** `lib/track.ts` — `track(event, props?)`（`window.dataLayer.push({ event, ...props })`・SSR安全）。
- **Create** `__tests__/unit/track.test.ts` — dataLayer 未定義でも投げない・push形状。
- **Modify** `middleware.ts:9` — `GUEST_PATHS` に `'/phrases-for'` 追加。
- **Modify** `app/layout.tsx` — `metadata` に `metadataBase` 追加。
- **Modify** `app/share/[id]/page.tsx:141,147` — CTA `/quiz`→`/demo/quiz`、`/`→`/demo`。
- **Modify** `app/login/page.tsx` — 主CTA/signup成功時に `track('login_cta_click')`（登録前計装）。
- **Modify** `app/demo/page.tsx` — マウント時 `track('demo_reached')`。
- **Modify** `app/auth/callback/route.ts` — 到達時サーバログ or リダイレクトにクエリ付与（`auth_callback_reached` はクライアント側で拾えないため、`/?welcome=1` 等の既存導線があればそこで発火。無ければ callback 到達は Supライン auth.users で代替＝計装スキップ）。

---

## Task 1: シーン設定モジュール（TDD）

**Files:**
- Create: `lib/landing-scenes.ts`
- Test: `__tests__/unit/landing-scenes.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

```typescript
import { describe, it, expect } from 'vitest'
import { getScene, LANDING_SCENE_SLUGS } from '@/lib/landing-scenes'
import { getSeedPhrases } from '@/lib/seed-phrases'

describe('landing-scenes', () => {
  it('全 slug が有効な seedKey に解決しフレーズが非空', () => {
    for (const slug of LANDING_SCENE_SLUGS) {
      const s = getScene(slug)!
      expect(s).toBeTruthy()
      expect(getSeedPhrases(s.seedKey).length).toBeGreaterThan(5)
    }
  })
  it('未知 slug は undefined', () => {
    expect(getScene('nope')).toBeUndefined()
  })
  it('slug に重複が無い', () => {
    expect(new Set(LANDING_SCENE_SLUGS).size).toBe(LANDING_SCENE_SLUGS.length)
  })
  it('title/description は SEO に足る長さ', () => {
    for (const slug of LANDING_SCENE_SLUGS) {
      const s = getScene(slug)!
      expect(s.title.length).toBeGreaterThan(10)
      expect(s.description.length).toBeGreaterThan(40)
      expect(s.h1.length).toBeGreaterThan(6)
    }
  })
})
```

- [ ] **Step 2: 失敗を確認** — `npx vitest run __tests__/unit/landing-scenes.test.ts`（Expected: モジュール未定義で FAIL）
- [ ] **Step 3: 実装** — `lib/landing-scenes.ts` に `LandingScene` 型・`SCENES` レコード（code-review/tech-conference/engineer-meeting）・`getScene(slug)`・`LANDING_SCENE_SLUGS`。`seedKey` は `SeedKey`、表示は `getSeedPhrases` を再利用。
- [ ] **Step 4: 緑を確認** — 同上コマンド（Expected: PASS）
- [ ] **Step 5: Commit** — `feat(seo): エンジニア長尾LPのシーン設定モジュール(TDD)`

---

## Task 2: track() 計装ヘルパー（TDD）

**Files:**
- Create: `lib/track.ts`, `components/TrackOnMount.tsx`
- Test: `__tests__/unit/track.test.ts`

- [ ] **Step 1: 失敗するテスト** — `track()` は `window` 未定義でも throw しない／`window.dataLayer` 未定義なら生成して push／`{ event, ...props }` 形状で push。
- [ ] **Step 2: 失敗を確認**（Expected: FAIL）
- [ ] **Step 3: 実装** — `lib/track.ts`:
```typescript
export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  const w = window as unknown as { dataLayer?: unknown[] }
  w.dataLayer = w.dataLayer ?? []
  w.dataLayer.push({ event, ...(props ?? {}) })
}
```
`components/TrackOnMount.tsx`（`'use client'`・`useEffect(() => track(event), [])`・描画なし）。
- [ ] **Step 4: 緑を確認**（Expected: PASS）
- [ ] **Step 5: Commit** — `feat(analytics): 登録前ファネル用 track() + TrackOnMount(TDD)`

---

## Task 3: シーンLP ページ

**Files:**
- Create: `app/phrases-for/[scene]/page.tsx`

- [ ] **Step 1: 実装** — Server Component:
  - `export function generateStaticParams()` → `LANDING_SCENE_SLUGS.map(scene => ({ scene }))`
  - `export async function generateMetadata({ params })` → scene 由来の title/description/openGraph（未知slugは汎用）
  - 本体: `const s = getScene(params.scene); if (!s) notFound()`。`getSeedPhrases(s.seedKey)` を H1＋intro の下にカード列挙（phrase / meaning_ja / original_context 例文）。冒頭に `<TrackOnMount event="lp_view" />`、末尾に CTA `<Link href="/demo/import">実際の会話・文書からピックしてみる</Link>`（+ `/login` への副次導線）。Trusted Teal トークン使用。
- [ ] **Step 2: ビルド確認** — `npm run build`（Expected: `/phrases-for/[scene]` が3 slug 分 SSG 生成・型エラー無し）
- [ ] **Step 3: 実機確認** — `/phrases-for/code-review` を pick-verify 不要（公開ページ）でブラウザ確認（フレーズ描画・CTA遷移）
- [ ] **Step 4: Commit** — `feat(seo): シーンLPをseed-phrasesから静的生成(code-review/tech-conference/engineer-meeting)`

---

## Task 4: middleware 公開登録（蛇口を開ける）

**Files:**
- Modify: `middleware.ts:9`

- [ ] **Step 1: 実装** — `GUEST_PATHS = ['/demo', '/api/demo', '/phrases-for']`
- [ ] **Step 2: 確認** — 未ログインで `/phrases-for/code-review` が 200（/loginに302されない）。ログイン必須ページ（/quiz）は従来通り302を維持。
- [ ] **Step 3: Commit** — `feat(seo): middlewareにLP(/phrases-for)を公開登録し認証302を回避`

---

## Task 5: robots.ts / sitemap.ts / metadataBase

**Files:**
- Create: `app/robots.ts`, `app/sitemap.ts`
- Modify: `app/layout.tsx`（`metadata.metadataBase = new URL('https://usepick.win')`）

- [ ] **Step 1: 実装 robots.ts** — `MetadataRoute.Robots`: Allow `/`・Disallow `['/quiz','/phrases','/history','/streak','/settings','/onboarding','/library','/api/']`・`sitemap: 'https://usepick.win/sitemap.xml'`
- [ ] **Step 2: 実装 sitemap.ts** — landing `/`・公開 `/login /about /privacy /terms /contact`・`LANDING_SCENE_SLUGS.map(s => '/phrases-for/'+s)` を列挙。
- [ ] **Step 3: metadataBase 付与**（OG相対URL解決のため）
- [ ] **Step 4: ビルド確認** — `npm run build` 後 `/robots.txt` `/sitemap.xml` が生成・LP URLが sitemap に含まれる。
- [ ] **Step 5: Commit** — `feat(seo): robots.ts/sitemap.ts + metadataBase を新設`

---

## Task 6: シェア着地CTA修復（副軸ループの漏れ）

**Files:**
- Modify: `app/share/[id]/page.tsx:141,147`

- [ ] **Step 1: 実装** — `href="/quiz"` → `href="/demo/quiz"`、`href="/"` → `href="/demo"`（未ログイン流入が認証ウォールに落ちない）。文言は「自分も挑戦する」「Pick とは？」を維持 or 微調整。
- [ ] **Step 2: 確認** — 未ログインで `/share/<id>` の両CTAが `/demo/*` に着地（302されない）。
- [ ] **Step 3: Commit** — `fix(share): 着地CTAを認証不要の/demoへ向けXシェア流入の離脱を止める`

---

## Task 7: 登録前イベントの結線

**Files:**
- Modify: `app/demo/page.tsx`（`<TrackOnMount event="demo_reached" />` or useEffect）
- Modify: `app/login/page.tsx`（主CTAクリック/signup成功で `track('login_cta_click')`）
- （LP表示は Task3 で `lp_view` 済み）

- [ ] **Step 1: 実装** — demo到達・login CTA の2イベントを追加（`lp_view` と合わせ登録前3イベント。callback到達は auth.users で代替のため計装スキップ）。
- [ ] **Step 2: 確認** — DevTools で `window.dataLayer` に各イベントが積まれる。
- [ ] **Step 3: Commit** — `feat(analytics): 登録前ファネル(lp_view/demo_reached/login_cta_click)を計装`

---

## Task 8: 検証ゲート（push前）

- [ ] **Step 1: 全テスト緑** — `npx vitest run`（既存116件＋新規が緑）
- [ ] **Step 2: 本番ビルド** — `npm run build`（型エラー無し・LP 3本 SSG・robots/sitemap 生成）
- [ ] **Step 3: 敵対的レビュー・ワークフロー**（このリポの確定運用）— 変更差分を多観点でレビューし実害バグを捕捉・修正。
- [ ] **Step 4: master へ commit/push**（Railway 自動デプロイ）。CI `verify` 通過を確認。
- [ ] **Step 5: 松井の手動タスク（非コード）** — ①Anthropic Console 予算アラート＋使用上限 ②Railway 請求通知 ③GA4 リアルタイムで自PV実測し測定ID確定 ④別名義Google資産の棚卸し ⑤Search Console にサイト/sitemap 登録。

---

## 完了の定義（Sprint 1）
- 未ログイン（＝Googlebot）で `/phrases-for/*` が 200・robots/sitemap が正しく生成され LP がクロール可能。
- Xシェア着地の両CTAが `/demo/*` に着地し離脱しない。
- 登録前3イベントが dataLayer に積まれ GA4 で観測できる状態。
- 全テスト緑・本番ビルド成功・master反映・CI verify 通過。
- Tier2（原価アラート/demo制限永続化+Haiku固定/judge日次上限/admin/logs封鎖）は次スプリントで実施（本スプリントでは §8 Step5 の暫定安全弁のみ）。
