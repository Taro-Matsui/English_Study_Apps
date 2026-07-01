// Pick 本番/対象URL への E2E スモーク（Playwright）。
// login → 主要ルートが認証維持でレンダリングされるかを確認しスクショを残す。
// ※ 読み取り系のみ（import/quiz回答をしない）＝ AI コスト・実データ生成を避ける。
//
// env:
//   PICK_BASE_URL      既定 https://usepick.win（CI では vars で上書き可）
//   PICK_TEST_EMAIL / PICK_TEST_PASSWORD  確認済みテスト垢（未設定なら skip=exit0）

import { chromium, devices } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = (process.env.PICK_BASE_URL || 'https://usepick.win').replace(/\/$/, '')
const EMAIL = process.env.PICK_TEST_EMAIL
const PASSWORD = process.env.PICK_TEST_PASSWORD
const OUT = 'e2e/screenshots'
const ROUTES = ['/', '/quiz', '/phrases', '/streak']

const log = (...m) => console.log('[e2e-smoke]', ...m)

if (!EMAIL || !PASSWORD) {
  log('PICK_TEST_EMAIL / PICK_TEST_PASSWORD 未設定のためスキップ（secrets を設定すると実行されます）')
  process.exit(0)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({ ...devices['iPhone 13'] })
  const page = await context.newPage()
  const failures = []

  // ── ログイン ──
  log('login as', EMAIL, 'at', BASE)
  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 30000 })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ])
  await page.waitForLoadState('networkidle').catch(() => {})

  if (page.url().includes('/login')) {
    const err = await page.locator('.text-red-500').first().textContent().catch(() => null)
    log('LOGIN FAILED', err || '(認証情報 / メール確認状態を確認)')
    await page.screenshot({ path: path.join(OUT, 'login-failed.png') }).catch(() => {})
    await browser.close()
    process.exit(1)
  }
  log('login ok ->', page.url())

  // ── 各ルートの smoke（認証維持・レンダリング・非クラッシュ）──
  for (const route of ROUTES) {
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 30000 })
      const url = page.url()
      const bodyLen = await page.evaluate(() => document.body?.innerText?.length ?? 0)
      const file = path.join(OUT, `page${route.replace(/\W+/g, '_') || '_root'}.png`)
      await page.screenshot({ path: file, fullPage: true })
      if (url.includes('/login')) failures.push(`${route}: /login にリダイレクト（セッション喪失）`)
      else if (bodyLen < 20) failures.push(`${route}: 本文がほぼ空（bodyLen=${bodyLen}）`)
      else log(`ok ${route} (len=${bodyLen})`)
    } catch (e) {
      failures.push(`${route}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  await browser.close()
  if (failures.length) {
    log('SMOKE FAILURES:')
    failures.forEach((f) => log(' -', f))
    process.exit(1)
  }
  log('all smoke checks passed')
}

main().catch((e) => { console.error('[e2e-smoke] fatal:', e); process.exit(1) })
