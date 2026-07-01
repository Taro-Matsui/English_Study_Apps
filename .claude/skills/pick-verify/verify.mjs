// Pick 認証画面の実機確認ハーネス（Playwright）。
// 一度ログインしてセッションを保存 → 以後は再利用し、任意ルートを開いてスクショを撮る。
//
// 使い方:
//   PICK_TEST_EMAIL=... PICK_TEST_PASSWORD=... \
//     node .claude/skills/pick-verify/verify.mjs <route> [--desktop] [--fresh] [--no-auth] [--out <file>]
//
// 例:
//   node .claude/skills/pick-verify/verify.mjs /library/import
//   node .claude/skills/pick-verify/verify.mjs /quiz --desktop
//   node .claude/skills/pick-verify/verify.mjs /demo --no-auth
//
// 環境変数:
//   PICK_BASE_URL     既定 http://localhost:3000 （本番検証は https://usepick.win）
//   PICK_TEST_EMAIL / PICK_TEST_PASSWORD  確認済みテスト垢（メール+パスワード）
//   PICK_AUTH_STATE   セッション保存先（既定 OS一時ディレクトリ）

import { chromium, devices } from 'playwright'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const args = process.argv.slice(2)
const route = args.find((a) => a.startsWith('/')) ?? '/'
const desktop = args.includes('--desktop')
const fresh = args.includes('--fresh')
const noAuth = args.includes('--no-auth')
const outIdx = args.indexOf('--out')

const BASE = (process.env.PICK_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const EMAIL = process.env.PICK_TEST_EMAIL
const PASSWORD = process.env.PICK_TEST_PASSWORD
const STATE = process.env.PICK_AUTH_STATE ?? path.join(os.tmpdir(), 'pick-auth-state.json')
const OUT = outIdx >= 0 && args[outIdx + 1]
  ? args[outIdx + 1]
  : path.join(os.tmpdir(), `pick-verify-${route.replace(/[^\w]+/g, '_') || 'root'}.png`)

const log = (...m) => console.log('[pick-verify]', ...m)

async function main() {
  const browser = await chromium.launch()
  const contextOpts = desktop
    ? { viewport: { width: 1280, height: 900 } }
    : { ...devices['iPhone 13'] }

  const useState = !noAuth && !fresh && fs.existsSync(STATE)
  const context = await browser.newContext(useState ? { ...contextOpts, storageState: STATE } : contextOpts)
  const page = await context.newPage()

  const target = BASE + route
  try {
    await page.goto(target, { waitUntil: 'networkidle', timeout: 20000 })
  } catch (e) {
    log('ERROR: 到達できません ->', target, '-', e.message)
    log('devサーバは起動していますか? `npm run dev`（または PICK_BASE_URL=https://usepick.win）')
    await browser.close()
    process.exit(2)
  }

  // 認証ゲートで /login に弾かれたらログインする
  if (!noAuth && page.url().includes('/login')) {
    if (!EMAIL || !PASSWORD) {
      log('未ログインかつ認証情報なし。確認済みテスト垢の PICK_TEST_EMAIL / PICK_TEST_PASSWORD を設定してください。')
      await browser.close()
      process.exit(3)
    }
    log('有効なセッションなし -> ログイン:', EMAIL)
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await Promise.all([
      page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 }).catch(() => {}),
      page.click('button[type="submit"]'),
    ])
    await page.waitForLoadState('networkidle').catch(() => {})

    if (page.url().includes('/login')) {
      const err = await page.locator('.text-red-500').first().textContent().catch(() => null)
      log('ログイン失敗。', err ? `エラー: ${err.trim()}` : '認証情報 / メール確認状態を確認してください。')
      await browser.close()
      process.exit(3)
    }
    await context.storageState({ path: STATE })
    log('セッションを保存:', STATE)
    await page.goto(target, { waitUntil: 'networkidle' })
  }

  if (page.url().includes('/onboarding') && !route.startsWith('/onboarding')) {
    log('NOTE: /onboarding に遷移。テスト垢がオンボーディング未完了です（先に一度完了させてください）。')
  }

  await page.screenshot({ path: OUT, fullPage: true })
  log('OK  url:', page.url())
  log('title:', await page.title())
  log('screenshot:', OUT)
  await browser.close()
}

main().catch((e) => {
  console.error('[pick-verify] fatal:', e)
  process.exit(1)
})
