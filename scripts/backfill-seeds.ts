/**
 * 既存ユーザーへの初期シード冪等バックフィル（T1-2 補填バッチ）
 *
 * onboarding 済みユーザーのうち、初期シード(source_type='System')が未配布、または
 * 旧版(共通5+目的別5=10件)のままのユーザーへ、現行の配布セット(共通5+目的別15=20件)
 * のうち「まだ存在しないフレーズ」だけを追加する。
 *
 * 冪等性: 既存の System フレーズ(論理削除済みも含む)の phrase 集合と突き合わせ、
 *   既にある phrase は再追加しない。何度実行しても重複せず、ユーザーが削除した
 *   シードを勝手に復活させることもない。
 *
 * 安全装置: 既定は dry-run（集計のみ・書き込みなし）。実書き込みは --apply 指定時のみ。
 *
 * 実行:
 *   npx tsx scripts/backfill-seeds.ts            # dry-run（変更なし・件数のみ表示）
 *   npx tsx scripts/backfill-seeds.ts --apply    # 実際に insert
 *
 * 環境変数（.env.local があれば自動読込、なければ実行環境から取得）:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { resolveSeedKey, buildSeedRows } from '../lib/seed-phrases'

// .env.local の最小ローダ（dotenv 非依存）。既存の process.env は上書きしない。
function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    let val = m[2]
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}

type AuthUser = { id: string; user_metadata?: Record<string, unknown> }

async function main() {
  const apply = process.argv.includes('--apply')
  loadEnvLocal()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('環境変数 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です')
    process.exit(1)
  }
  const db = createClient(url, key)

  console.log(apply ? '=== APPLY モード（実書き込み）===' : '=== DRY-RUN（変更なし・--apply で実行）===')

  // 全ユーザーをページングで取得。
  // 注意: GoTrue は per_page にサーバ側上限(GOTRUE_API_MAX_ROWS, 概ね100)を課し、
  //   それを超える perPage 要求は黙って切り詰められる。終了判定を「受信件数 < perPage」に
  //   すると1ページ目で誤って break し大半が漏れるため、必ず data.nextPage を基準にする。
  const users: AuthUser[] = []
  const perPage = 100
  let page = 1
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('listUsers error:', error.message)
      process.exit(1)
    }
    const batch = data.users as AuthUser[]
    users.push(...batch)
    const nextPage = (data as { nextPage?: number | null }).nextPage
    if (nextPage) {
      page = nextPage
      continue
    }
    // nextPage 不在(旧lib)時のフォールバック: 空 or 上限未満で終了
    if (batch.length === 0 || batch.length < perPage) break
    page++
  }
  console.log(`総ユーザー数: ${users.length}`)

  const today = new Date().toISOString().split('T')[0]
  let onboarded = 0
  let skipped = 0
  let targetUsers = 0
  let totalRows = 0
  let errors = 0

  for (const u of users) {
    const meta = u.user_metadata ?? {}
    if (!meta.onboarding_complete) {
      skipped++
      continue
    }
    onboarded++

    const seedKey = resolveSeedKey(meta.study_purpose as string, meta.study_subcategory as string)
    const expected = buildSeedRows(seedKey, u.id, today)

    // 重複回避のため既存フレーズを全ソース・論理削除込みで取得。
    //   ① 生存(deleted_at=null)フレーズは全ソースで突合 → import 等で既に持つ語の二重化を防ぐ
    //   ② 削除済みでも System シードは突合 → ユーザーが消したシードを勝手に復活させない
    const { data: existing, error: exErr } = await db
      .from('phrases')
      .select('phrase, source_type, deleted_at')
      .eq('user_id', u.id)
    if (exErr) {
      console.error(`[${u.id}] 既存取得失敗: ${exErr.message}`)
      errors++
      continue
    }
    const have = new Set(
      (existing ?? [])
        .filter((r: { source_type: string | null; deleted_at: string | null }) =>
          r.deleted_at === null || r.source_type === 'System')
        .map((r: { phrase: string }) => r.phrase)
    )
    const missing = expected.filter((r) => !have.has(r.phrase))
    if (missing.length === 0) continue

    targetUsers++
    totalRows += missing.length

    if (apply) {
      const { error: insErr } = await db.from('phrases').insert(missing)
      if (insErr) {
        console.error(`[${u.id}] insert失敗: ${insErr.message}`)
        errors++
        continue
      }
    }
    console.log(`${apply ? '追加' : '追加予定'}: user=${u.id} seedKey=${seedKey} +${missing.length}件`)
  }

  console.log('---')
  console.log(`onboarding済: ${onboarded} / 未onboarding(skip): ${skipped}`)
  console.log(`補填対象ユーザー: ${targetUsers} / 追加${apply ? '' : '予定'}行数: ${totalRows} / エラー: ${errors}`)
  if (!apply) console.log('※ dry-run です。実行するには --apply を付けてください。')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
