import * as cheerio from 'cheerio'
import { httpFetch } from './fetcher'
import { getRobotsForDomain, isAllowed } from './robots'

function toAbsolute(root: string, href: string): string | null {
  try {
    const u = new URL(href, root)
    return u.href
  } catch {
    return null
  }
}

function isLikelyHtml(contentType: string | null): boolean {
  if (!contentType) return false
  return /text\/html|application\/(xhtml\+xml|html)/i.test(contentType)
}

export async function fetchHtml(url: string): Promise<string | null> {
  const res = await httpFetch(url, { method: 'GET', headers: { accept: 'text/html,application/xhtml+xml' } })
  if (!res.ok) return null
  const ct = res.headers.get('content-type')
  if (!isLikelyHtml(ct)) return null
  return await res.text()
}

const RETURN_KEYS = ['return', 'returns', 'refund', 'refunds', 'exchange', 'exchanges']
const SHIPPING_KEYS = ['shipping', 'delivery', 'postage', 'freight']

export function discoverPolicyLinks(origin: string, html: string): { returnUrl?: string; shippingUrl?: string } {
  const $ = cheerio.load(html)
  const retCandidates: string[] = []
  const shipCandidates: string[] = []

  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim()
    const text = ($(el).text() || '').trim().toLowerCase()
    if (!href) return

    const retHit = RETURN_KEYS.some((k) => href.toLowerCase().includes(k) || text.includes(k))
    const shipHit = SHIPPING_KEYS.some((k) => href.toLowerCase().includes(k) || text.includes(k))

    const abs = toAbsolute(origin, href)
    if (!abs) return

    if (retHit) retCandidates.push(abs)
    if (shipHit) shipCandidates.push(abs)
  })

  // Prefer shorter, more specific URLs
  retCandidates.sort((a, b) => a.length - b.length)
  shipCandidates.sort((a, b) => a.length - b.length)

  return { returnUrl: retCandidates[0], shippingUrl: shipCandidates[0] }
}

export async function discoverPolicyUrls(origin: string): Promise<{ returnUrl?: string; shippingUrl?: string }> {
  const html = await fetchHtml(origin)
  if (!html) return {}
  return discoverPolicyLinks(origin, html)
}
