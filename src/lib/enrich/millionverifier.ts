type MillionVerifierResponse = {
  email?: string
  quality?: string
  result?: string
  resultcode?: number
  subresult?: string
  free?: boolean
  role?: boolean
  didyoumean?: string
  credits?: number
  executiontime?: number
  error?: string
  livemode?: boolean
}

export type Verification = {
  status: 'valid' | 'risky' | 'invalid' | 'unknown' | 'catch_all' | 'disposable'
  score?: number | null
  provider?: 'millionverifier'
  raw?: any
}

const ENABLED = String(process.env.MILLIONVERIFIER_ENABLED || 'false').toLowerCase() === 'true'
const API_KEY = process.env.MILLIONVERIFIER_API_KEY || ''

export function isMillionVerifierEnabled(): boolean {
  return ENABLED && !!API_KEY
}

function mapResultToStatus(result?: string, subresult?: string): Verification['status'] {
  const r = (result || '').toLowerCase()
  const s = (subresult || '').toLowerCase()
  if (r === 'ok' || r === 'valid' || r === 'good' || r === 'passed') return 'valid'
  if (r === 'invalid' || r === 'bad' || r === 'failed') return 'invalid'
  if (r === 'catch-all' || r === 'catch_all') return 'catch_all'
  if (r === 'unknown' || s === 'unknown') return 'unknown'
  if (r === 'risky') return 'risky'
  if (r === 'disposable' || s === 'disposable') return 'disposable'
  return 'unknown'
}

export async function verifyWithMillionVerifier(email: string, timeoutSec = 10): Promise<Verification> {
  if (!isMillionVerifierEnabled()) return { status: 'unknown' }
  const url = new URL('https://api.millionverifier.com/api/v3/')
  url.searchParams.set('api', API_KEY)
  url.searchParams.set('email', email)
  url.searchParams.set('timeout', String(Math.min(Math.max(timeoutSec, 2), 60)))
  try {
    const res = await fetch(url.toString(), { method: 'GET' })
    if (!res.ok) return { status: 'unknown' }
    const json: MillionVerifierResponse = await res.json()
    const status = mapResultToStatus(json.result, json.subresult)
    return { status, score: null, provider: 'millionverifier', raw: json }
  } catch {
    return { status: 'unknown' }
  }
}
