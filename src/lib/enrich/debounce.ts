type DeBounceResponse = {
  result: string
  reason?: string
  score?: number
  did_you_mean?: string
}

const ENABLED = String(process.env.DEBOUNCE_ENABLED || 'false').toLowerCase() === 'true'
const API_KEY = process.env.DEBOUNCE_API_KEY || ''

export type Verification = {
  status: 'valid' | 'risky' | 'invalid' | 'unknown' | 'catch_all' | 'disposable'
  score?: number | null
  provider?: 'debounce'
  raw?: any
}

export function isDeBounceEnabled(): boolean {
  return ENABLED && !!API_KEY
}

export async function verifyWithDeBounce(email: string): Promise<Verification> {
  if (!isDeBounceEnabled()) return { status: 'unknown' }
  const url = new URL('https://api.debounce.io/v1/verify')
  url.searchParams.set('email', email)
  url.searchParams.set('api', API_KEY)
  try {
    const res = await fetch(url.toString())
    if (!res.ok) return { status: 'unknown' }
    const json: any = await res.json()
    const body: DeBounceResponse | undefined = json?.debounce
    const result = body?.result?.toLowerCase() || 'unknown'
    const score = typeof body?.score === 'number' ? body?.score : undefined
    let status: Verification['status'] = 'unknown'
    switch (result) {
      case 'Safe to Send':
      case 'valid':
        status = 'valid'
        break
      case 'Accept All':
      case 'catch-all':
      case 'catch_all':
        status = 'catch_all'
        break
      case 'Disposable':
      case 'disposable':
        status = 'disposable'
        break
      case 'Unknown':
      case 'unknown':
        status = 'unknown'
        break
      case 'Risky':
      case 'risky':
        status = 'risky'
        break
      case 'Invalid':
      case 'invalid':
        status = 'invalid'
        break
      default:
        status = 'unknown'
    }
    return { status, score: score ?? null, provider: 'debounce', raw: json }
  } catch {
    return { status: 'unknown' }
  }
}
