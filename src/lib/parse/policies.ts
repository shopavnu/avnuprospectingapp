import * as cheerio from 'cheerio'

export type ReturnPolicyInfo = {
  returnWindowDays?: number | null
  notes?: string | null
  evidence?: string | null
}

export type ShippingPolicyInfo = {
  shippingFree?: boolean | null
  shippingAlwaysFree?: boolean | null
  shippingFreeThreshold?: number | null
  shippingCurrency?: string | null
  notes?: string | null
  evidence?: string | null
}

function getVisibleText(html: string): string {
  const $ = cheerio.load(html)
  $('script, style, noscript, svg').remove()
  const text = $('body').text().replace(/\s+/g, ' ').trim()
  return text
}

function snippetAround(text: string, index: number, span = 120): string {
  const start = Math.max(0, index - span)
  const end = Math.min(text.length, index + span)
  return text.slice(start, end)
}

export function parseReturnPolicy(html: string): ReturnPolicyInfo {
  const text = getVisibleText(html)
  // Common patterns: "30 day returns", "within 30 days", "30-day return window"
  const re = /(\bwithin\s+)?(\d{1,3})\s*[-\s]?day(s)?\s+(return|returns|refunds?|exchange)/i
  const m = text.match(re)
  const result: ReturnPolicyInfo = {}
  if (m) {
    const days = parseInt(m[2], 10)
    if (Number.isFinite(days)) result.returnWindowDays = days
    result.evidence = snippetAround(text, m.index || 0)
  }
  return result
}

function parseCurrencyAmount(s: string): { currency: string; amount: number } | null {
  // Capture currency and amount like $50, USD 50, £40, €30
  const m = s.match(/(USD|CAD|AUD|EUR|GBP|\$|£|€)\s?([0-9]+(?:\.[0-9]{1,2})?)/i)
  if (!m) return null
  const cur = m[1]
  const amount = parseFloat(m[2])
  const currency = cur === '$' ? '$' : cur.toUpperCase()
  if (!isFinite(amount)) return null
  return { currency, amount }
}

export function parseShippingPolicy(html: string): ShippingPolicyInfo {
  const text = getVisibleText(html)
  const info: ShippingPolicyInfo = {}

  // Always free: "Free shipping on all orders"
  const alwaysFree = text.match(/free\s+shipping\s+(on\s+)?all\s+orders/i)
  if (alwaysFree) {
    info.shippingFree = true
    info.shippingAlwaysFree = true
    info.evidence = snippetAround(text, alwaysFree.index || 0)
    return info
  }

  // Free over threshold: "Free shipping on orders over $50"
  const over = text.match(/free\s+shipping\s+on\s+orders?\s+(over|above|from)\s+([^\s,.]+)/i)
  if (over) {
    const cur = parseCurrencyAmount(over[2])
    info.shippingFree = true
    info.shippingAlwaysFree = false
    if (cur) {
      info.shippingFreeThreshold = cur.amount
      info.shippingCurrency = cur.currency
    }
    info.evidence = snippetAround(text, over.index || 0)
    return info
  }

  // Generic "Free shipping" mention (not always, but free exists)
  const free = text.match(/free\s+shipping/i)
  if (free) {
    info.shippingFree = true
    info.shippingAlwaysFree = null
    info.evidence = snippetAround(text, free.index || 0)
  }

  return info
}
