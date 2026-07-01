import { vi } from 'vitest'

/**
 * チェイン可能な Supabase クライアントのテスト用モック。
 * `db.from(table).select().eq().is().or()...` を任意深さで受け、await / .single() で結果を返す。
 * 呼ばれたメソッドと引数を calls に記録するため、フィルタ文字列（例: 三値論理の .or）まで検証できる。
 *
 * tables[table] が配列なら from() 呼び出しごとに先頭から消費（同一テーブルへの複数クエリで別結果を返す）。
 * オブジェクトなら毎回同じ結果を返す。
 */
export interface MockResult {
  data?: unknown
  count?: number
  error?: unknown
}

export interface MockOptions {
  tables?: Record<string, MockResult | MockResult[]>
  rpc?: MockResult
  getUserById?: MockResult
}

const DEFAULT: MockResult = { data: null, count: 0, error: null }
const CHAIN_METHODS = [
  'select', 'insert', 'update', 'upsert', 'delete',
  'eq', 'neq', 'is', 'or', 'and', 'gte', 'lte', 'gt', 'lt',
  'in', 'not', 'like', 'ilike', 'order', 'limit', 'range', 'match', 'contains', 'filter',
]

export function makeSupabaseMock(opts: MockOptions = {}) {
  const tables = opts.tables ?? {}
  const rpc = opts.rpc ?? DEFAULT
  const calls: Record<string, unknown[][]> = {}
  const rec = (m: string, args: unknown[]) => {
    ;(calls[m] = calls[m] || []).push(args)
  }

  const makeChain = (result: MockResult) => {
    const chain: Record<string, unknown> = {}
    for (const m of CHAIN_METHODS) {
      chain[m] = (...args: unknown[]) => {
        rec(m, args)
        return chain
      }
    }
    chain.single = (...args: unknown[]) => {
      rec('single', args)
      return Promise.resolve(result)
    }
    chain.maybeSingle = (...args: unknown[]) => {
      rec('maybeSingle', args)
      return Promise.resolve(result)
    }
    // await 可能に（PostgREST のビルダーは thenable）
    chain.then = (res: (v: MockResult) => unknown, rej: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej)
    return chain
  }

  const client = {
    from: (table: string) => {
      rec('from', [table])
      const t = tables[table]
      let result: MockResult
      if (Array.isArray(t)) result = t.length ? (t.shift() as MockResult) : DEFAULT
      else result = t ?? DEFAULT
      return makeChain(result)
    },
    rpc: (...args: unknown[]) => {
      rec('rpc', args)
      return Promise.resolve(rpc)
    },
    auth: {
      admin: {
        getUserById: vi.fn(async () => opts.getUserById ?? { data: { user: null } }),
      },
    },
  }

  return { client, calls }
}
