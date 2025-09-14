import { httpFetch, limit } from './fetcher'
import { RobotsRules, getRobotsForDomain, isAllowed } from './robots'
import { XMLParser } from 'fast-xml-parser'
import * as cheerio from 'cheerio'

const parser = new XMLParser({ ignoreAttributes: false })

function toAbsolute(root: string, href: string): string | null {
  try {
    const u = new URL(href, root)
    return u.href
  } catch {
    return null
  }
}

async function fetchText(url: string): Promise<string | null> {
  const res = await httpFetch(url, { method: 'GET' })
  if (!res.ok) return null
  return await res.text()
}

export async function discoverFromSitemap(root: string, robots: RobotsRules | null, max: number): Promise<string[]> {
  const origin = root.replace(/\/$/, '')
  const sitemapUrl = `${origin}/sitemap.xml`
  const xml = await fetchText(sitemapUrl)
  if (!xml) return []
  let urls: string[] = []
  try {
    const json = parser.parse(xml)
    // Shopify has <sitemapindex><sitemap><loc>...</loc></sitemap>*
    const children: string[] = []
    const index = json.sitemapindex
    if (index?.sitemap) {
      const arr = Array.isArray(index.sitemap) ? index.sitemap : [index.sitemap]
      for (const sm of arr) {
        if (sm?.loc) children.push(sm.loc as string)
      }
    }
    // Prefer product sitemaps
    const productChild = children.find((u) => /sitemap_products|product/i.test(u)) || children[0]
    if (productChild) {
      const childXml = await fetchText(productChild)
      if (childXml) {
        const childJson = parser.parse(childXml)
        const urlset = childJson.urlset
        if (urlset?.url) {
          const arr = Array.isArray(urlset.url) ? urlset.url : [urlset.url]
          for (const u of arr) {
            const loc = u?.loc as string | undefined
            if (!loc) continue
            if (robots && !isAllowed(loc, robots)) continue
            urls.push(loc)
            if (urls.length >= max) break
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return urls.slice(0, max)
}

export async function discoverFromHtml(root: string, robots: RobotsRules | null, max: number): Promise<string[]> {
  const origin = root.replace(/\/$/, '')
  const homepage = await fetchText(origin)
  const set = new Set<string>()
  if (homepage) {
    const $ = cheerio.load(homepage)
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (!/\/products\//.test(href)) return
      const abs = toAbsolute(origin, href)
      if (!abs) return
      if (robots && !isAllowed(abs, robots)) return
      set.add(abs)
    })
  }
  // optionally try a common collections page
  if (set.size < max) {
    const collectionsUrl = `${origin}/collections/all`
    const html = await fetchText(collectionsUrl)
    if (html) {
      const $ = cheerio.load(html)
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || ''
        if (!/\/products\//.test(href)) return
        const abs = toAbsolute(origin, href)
        if (!abs) return
        if (robots && !isAllowed(abs, robots)) return
        set.add(abs)
      })
    }
  }
  return Array.from(set).slice(0, max)
}

export async function discoverProductUrls(root: string, max = 50): Promise<string[]> {
  const robots = await getRobotsForDomain(root).catch(() => null)
  const fromSitemap = await discoverFromSitemap(root, robots, max)
  if (fromSitemap.length >= Math.min(max, 10)) return fromSitemap.slice(0, max)
  const fromHtml = await discoverFromHtml(root, robots, max)
  const merged = Array.from(new Set([...fromSitemap, ...fromHtml]))
  return merged.slice(0, max)
}
