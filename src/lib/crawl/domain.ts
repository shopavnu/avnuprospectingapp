import { httpFetch } from './fetcher'

const CANDIDATE_TLDS = ['.com', '.co', '.shop']

function normalize(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function candidateHosts(merchantName: string): string[] {
  const slug = normalize(merchantName)
  const hosts = new Set<string>()
  for (const tld of CANDIDATE_TLDS) {
    hosts.add(`https://${slug}${tld}`)
    hosts.add(`https://www.${slug}${tld}`)
  }
  return [...hosts]
}

export function isLikelyHtml(contentType: string | null): boolean {
  if (!contentType) return false
  return /text\/html|application\/(xhtml\+xml|html)/i.test(contentType)
}

export async function testUrl(url: string): Promise<{ ok: boolean; shopify: boolean; finalUrl?: string } | null> {
  try {
    const res = await httpFetch(url, { method: 'GET', redirect: 'follow' })
    const ok = res.status >= 200 && res.status < 400
    const ct = res.headers.get('content-type')
    let bodyText = ''
    if (ok && isLikelyHtml(ct)) {
      bodyText = (await res.text()).slice(0, 20000) // limit
    }
    let shopify = detectShopify(res.headers, bodyText)
    const finalUrl = res.url
    // If not detected from headers/html, try probing Shopify-specific endpoints
    if (!shopify && ok) {
      try {
        const origin = new URL(finalUrl).origin
        // Probe cart.js (common on Shopify)
        const cartRes = await httpFetch(origin + '/cart.js', { method: 'GET', headers: { accept: 'application/json' } })
        if (cartRes.ok) {
          const text = await cartRes.text()
          if (/\{"token":|"items"\s*:\s*\[/.test(text)) shopify = true
        }
        // Probe products.json as fallback (not always enabled)
        if (!shopify) {
          const prodRes = await httpFetch(origin + '/products.json?limit=1', { method: 'GET', headers: { accept: 'application/json' } })
          if (prodRes.ok) {
            const txt = await prodRes.text()
            if (/"products"\s*:\s*\[/.test(txt)) shopify = true
          }
        }
      } catch {}
    }
    return { ok, shopify, finalUrl }
  } catch {
    return null
  }
}

export function detectShopify(headers: Headers, html: string): boolean {
  // Common Shopify signals: x-shopify-* headers, cdn.shopify.com assets, Shopify theme data
  const headerKeys = Array.from(headers.keys())
  if (headerKeys.some((k) => k.toLowerCase().startsWith('x-shopify-'))) return true
  const server = headers.get('server') || ''
  if (/shopify/i.test(server)) return true
  if (/cdn\.shopify\.com/i.test(html)) return true
  if (/Shopify\.theme|ShopifyAnalytics|window\.__st\s*=/.test(html)) return true
  return false
}
