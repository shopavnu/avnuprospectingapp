import pLimit from 'p-limit'

const DEFAULT_CONCURRENCY = Number(process.env.CRAWL_CONCURRENCY || 6)
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 15000)
const REQUEST_RETRIES = Number(process.env.REQUEST_RETRIES || 2)
const REQUEST_JITTER_MS = Number(process.env.REQUEST_JITTER_MS || 500)
const USER_AGENT = process.env.USER_AGENT || 'avnu-ratings-crawler/1.0 (+contact@example.com)'

const limiter = pLimit(DEFAULT_CONCURRENCY)

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  const ac = new AbortController()
  const t = setTimeout(() => ac.abort('timeout'), ms)
  try {
    const r = await p
    return r
  } finally {
    clearTimeout(t)
  }
}

export async function httpFetch(url: string, init?: RequestInit & { retry?: number; jitterMs?: number }): Promise<Response> {
  const retry = init?.retry ?? REQUEST_RETRIES
  const jitterMs = init?.jitterMs ?? REQUEST_JITTER_MS
  const headers = new Headers(init?.headers)
  if (!headers.has('user-agent')) headers.set('user-agent', USER_AGENT)
  if (!headers.has('accept')) headers.set('accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')

  for (let attempt = 0; attempt <= retry; attempt++) {
    try {
      const res = await withTimeout(fetch(url, { ...init, headers }), REQUEST_TIMEOUT_MS)
      return res
    } catch (e) {
      if (attempt === retry) throw e
      const backoff = (attempt + 1) * (250 + Math.random() * jitterMs)
      await sleep(backoff)
    }
  }
  // Should be unreachable
  throw new Error('Fetch failed after retries')
}

export function limit<T>(fn: () => Promise<T>) {
  return limiter(fn)
}
