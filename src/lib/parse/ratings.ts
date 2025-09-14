import JSON5 from 'json5'
import * as cheerio from 'cheerio'

export type ExtractedRating = {
  title?: string | null
  ratingValue?: number | null
  reviewCount?: number | null
  widget?: 'yotpo' | 'judgeme' | 'okendo' | 'stamped' | 'none' | 'unknown'
  source: 'jsonld' | 'widget' | 'dom'
  evidence?: string | null
}

function clampRating(n: any): number | null {
  const x = typeof n === 'string' ? parseFloat(n) : typeof n === 'number' ? n : NaN
  if (!isFinite(x)) return null
  // most stores use 0..5
  if (x < 0 || x > 5.5) return null
  return Math.round(x * 100) / 100
}

function toInt(n: any): number | null {
  const x = typeof n === 'string' ? parseInt(n.replace(/[,\s]/g, ''), 10) : typeof n === 'number' ? Math.floor(n) : NaN
  return isFinite(x) && x >= 0 ? x : null
}

function pickBestProduct(candidates: any[], pageUrl: string): any | null {
  if (!candidates.length) return null
  // prefer matching url/@id
  const uNoHash = pageUrl.split('#')[0]
  const withUrl = candidates.find((c) => {
    const id = c['@id'] || c.url || c.offers?.url
    return typeof id === 'string' && uNoHash.includes(id.split('#')[0])
  })
  if (withUrl) return withUrl
  // else max reviewCount
  let best = candidates[0]
  let bestCount = toInt(best?.aggregateRating?.reviewCount) || 0
  for (const c of candidates) {
    const rc = toInt(c?.aggregateRating?.reviewCount) || 0
    if (rc > bestCount) {
      best = c
      bestCount = rc
    }
  }
  return best
}

export function extractFromJSONLD(html: string, pageUrl: string): ExtractedRating | null {
  const $ = cheerio.load(html)
  const scripts = $('script[type="application/ld+json"]').toArray()
  const products: any[] = []
  for (const s of scripts) {
    const text = $(s).contents().text().trim()
    if (!text) continue
    try {
      const json = JSON5.parse(text)
      const items = Array.isArray(json) ? json : [json]
      for (const item of items) {
        if (!item) continue
        if (Array.isArray(item['@type'])) {
          if (item['@type'].includes('Product')) products.push(item)
        } else if (item['@type'] === 'Product') {
          products.push(item)
        } else if (item['@graph']) {
          const graphArr = Array.isArray(item['@graph']) ? item['@graph'] : [item['@graph']]
          for (const g of graphArr) {
            if (g && (g['@type'] === 'Product' || (Array.isArray(g['@type']) && g['@type'].includes('Product')))) {
              products.push(g)
            }
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  if (!products.length) return null
  const prod = pickBestProduct(products, pageUrl)
  if (!prod) return null
  const title = prod.name || null
  const ratingValue = clampRating(prod.aggregateRating?.ratingValue)
  const reviewCount = toInt(prod.aggregateRating?.reviewCount)
  if (ratingValue == null && reviewCount == null) return null
  const evidence = JSON.stringify({ name: title, aggregateRating: prod.aggregateRating || null }).slice(0, 500)
  return { title: title ?? null, ratingValue, reviewCount, widget: 'none', source: 'jsonld', evidence }
}

export function extractFromWidgets(html: string): ExtractedRating | null {
  const $ = cheerio.load(html)
  // Judge.me common markup
  let widget: ExtractedRating['widget'] = 'unknown'
  // Try Judge.me
  if ($('.jdgm-prev-badge, .jdgm-widget, [class*="jdgm-"]').length > 0) {
    widget = 'judgeme'
    const txt = $('.jdgm-prev-badge__text, .jdgm-rev-widg__summary').text()
    const m = txt.match(/([0-9]+(\.[0-9]+)?)\s*out of\s*5/i) || txt.match(/Rated\s*([0-9]+(\.[0-9]+)?)/i)
    const rc = txt.match(/([0-9,]+)\s*reviews?/i)
    const ratingValue = m ? clampRating(m[1]) : null
    const reviewCount = rc ? toInt(rc[1]) : null
    if (ratingValue != null || reviewCount != null) {
      const evidence = txt.trim().slice(0, 300)
      return { ratingValue, reviewCount, widget, source: 'widget', evidence }
    }
  }
  // Yotpo
  if ($('[class*="yotpo"], script[src*="yotpo"]').length > 0) {
    widget = 'yotpo'
    const txt = $('[class*="yotpo"], .yotpo-review, .yotpo-stars').text()
    const m = txt.match(/([0-9]+(\.[0-9]+)?)\s*\/\s*5/) || txt.match(/Rated\s*([0-9]+(\.[0-9]+)?)/i)
    const rc = txt.match(/([0-9,]+)\s*reviews?/i)
    const ratingValue = m ? clampRating(m[1]) : null
    const reviewCount = rc ? toInt(rc[1]) : null
    if (ratingValue != null || reviewCount != null) {
      const evidence = txt.trim().slice(0, 300)
      return { ratingValue, reviewCount, widget, source: 'widget', evidence }
    }
  }
  // Okendo
  if ($('script[src*="okendo"], [class*="oke-"], [data-oke-reviews]').length > 0) {
    widget = 'okendo'
    const txt = $('[class*="oke-"], [data-oke-reviews]').text()
    const m = txt.match(/([0-9]+(\.[0-9]+)?)\s*\/\s*5/) || txt.match(/Rated\s*([0-9]+(\.[0-9]+)?)/i)
    const rc = txt.match(/([0-9,]+)\s*reviews?/i)
    const ratingValue = m ? clampRating(m[1]) : null
    const reviewCount = rc ? toInt(rc[1]) : null
    if (ratingValue != null || reviewCount != null) {
      const evidence = txt.trim().slice(0, 300)
      return { ratingValue, reviewCount, widget, source: 'widget', evidence }
    }
  }
  // Stamped
  if ($('script[src*="stamped"], [class*="stamped-"], .stamped-product-reviews-badge').length > 0) {
    widget = 'stamped'
    const txt = $('[class*="stamped-"], .stamped-product-reviews-badge').text()
    const m = txt.match(/([0-9]+(\.[0-9]+)?)\s*\/\s*5/) || txt.match(/Rated\s*([0-9]+(\.[0-9]+)?)/i)
    const rc = txt.match(/([0-9,]+)\s*reviews?/i)
    const ratingValue = m ? clampRating(m[1]) : null
    const reviewCount = rc ? toInt(rc[1]) : null
    if (ratingValue != null || reviewCount != null) {
      const evidence = txt.trim().slice(0, 300)
      return { ratingValue, reviewCount, widget, source: 'widget', evidence }
    }
  }
  // Fallback none
  return null
}

export function extractProductRating(html: string, pageUrl: string): ExtractedRating | null {
  const fromLd = extractFromJSONLD(html, pageUrl)
  if (fromLd) return fromLd
  const fromWidget = extractFromWidgets(html)
  if (fromWidget) return fromWidget
  return null
}
