import * as cheerio from 'cheerio'
import { httpFetch } from '@/lib/crawl/fetcher'
import { isAllowed } from '@/lib/crawl/robots'
import dns from 'node:dns/promises'

export type FoundEmail = {
  address: string
  type: 'personal' | 'generic'
  sourceUrl: string
  evidence?: string
  verifiedSyntax: boolean
  verifiedMx: boolean
}

const GENERIC_LOCALPARTS = [
  'info','contact','support','help','sales','hello','hi','team','careers','jobs','press','media','pr','privacy','legal','admin','orders','service','customer','customerservice','returns','shipping','billing','refunds'
]

const PATH_CANDIDATES = ['', '/about', '/team', '/contact', '/support', '/help', '/customer-service', '/faq', '/press', '/careers']

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

function classifyType(email: string): 'personal' | 'generic' {
  const local = email.split('@')[0].toLowerCase()
  if (GENERIC_LOCALPARTS.includes(local)) return 'generic'
  // Multi-word names likely personal
  if (/^[a-z]+\.[a-z]+$/.test(local)) return 'personal'
  // Contains dash or underscore might be alias; assume personal if two tokens
  if (/([a-z]+[-_][a-z]+)/.test(local)) return 'personal'
  // Default generic if local is short
  if (local.length <= 4) return 'generic'
  return 'personal'
}

function isValidSyntax(email: string): boolean {
  // Simple RFC-ish syntax check
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
  return re.test(email)
}

async function hasMx(domain: string): Promise<boolean> {
  try {
    const mx = await dns.resolveMx(domain)
    return Array.isArray(mx) && mx.length > 0
  } catch {
    return false
  }
}

export function extractEmailsFromHtml(html: string): Array<{ email: string; context: string }>{
  const $ = cheerio.load(html)
  $('script, style, noscript').remove()
  const text = $('body').text() || ''
  const results: Array<{ email: string; context: string }> = []

  const seen = new Set<string>()

  // mailto links first
  $('a[href^="mailto:"]').each((_, el) => {
    const href = ($(el).attr('href') || '').slice('mailto:'.length)
    const email = href.split('?')[0].trim()
    if (!email) return
    if (seen.has(email.toLowerCase())) return
    seen.add(email.toLowerCase())
    const context = ($(el).text() || '').trim() || email
    results.push({ email, context })
  })

  // Raw text regex
  const matches = text.match(EMAIL_REGEX) || []
  for (const m of matches) {
    const email = m.trim()
    if (!email) continue
    if (seen.has(email.toLowerCase())) continue
    seen.add(email.toLowerCase())
    const idx = text.indexOf(m)
    const start = Math.max(0, idx - 80)
    const end = Math.min(text.length, idx + 80)
    const context = text.slice(start, end)
    results.push({ email, context })
  }

  return results
}

export async function findEmailsForOrigin(origin: string, robots: any | null): Promise<FoundEmail[]> {
  const out: FoundEmail[] = []
  const seenAddr = new Set<string>()

  for (const path of PATH_CANDIDATES) {
    const url = new URL(path || '/', origin).href
    if (robots && !isAllowed(url, robots)) continue
    const res = await httpFetch(url, { method: 'GET', headers: { accept: 'text/html,application/xhtml+xml' } })
    if (!res.ok) continue
    const html = await res.text()
    const found = extractEmailsFromHtml(html)
    for (const f of found) {
      const address = f.email.toLowerCase()
      if (!isValidSyntax(address)) continue
      if (seenAddr.has(address)) continue
      seenAddr.add(address)
      const t = classifyType(address)
      const domain = address.split('@')[1]
      const mx = await hasMx(domain)
      out.push({ address, type: t, sourceUrl: url, evidence: f.context, verifiedSyntax: true, verifiedMx: mx })
    }
  }

  return out
}
