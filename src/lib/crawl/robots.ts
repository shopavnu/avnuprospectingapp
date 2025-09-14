import { prisma } from '@/server/db'
import { httpFetch } from './fetcher'

const RESPECT_ROBOTS = (process.env.RESPECT_ROBOTS || 'true').toLowerCase() === 'true'

export type RobotsRules = {
  allow: string[]
  disallow: string[]
}

function parseRobots(content: string): RobotsRules {
  const lines = content.split(/\r?\n/)
  let inStar = false
  const allow: string[] = []
  const disallow: string[] = []
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const [keyRaw, valueRaw = ''] = line.split(':', 2)
    const key = keyRaw.trim().toLowerCase()
    const value = valueRaw.trim()
    if (key === 'user-agent') {
      inStar = value === '*' // take the * section only
    } else if (inStar && key === 'allow') {
      allow.push(value)
    } else if (inStar && key === 'disallow') {
      disallow.push(value)
    }
  }
  return { allow, disallow }
}

function pathMatchesRule(path: string, rule: string): boolean {
  if (rule === '') return false
  // Basic prefix match is sufficient for most robots.txt
  return path.startsWith(rule)
}

export function isAllowed(url: string, robots: RobotsRules | null): boolean {
  if (!RESPECT_ROBOTS || !robots) return true
  try {
    const u = new URL(url)
    const path = u.pathname + (u.search || '')
    // Allow rules override disallow if longer match
    let longestAllow = ''
    for (const a of robots.allow) if (pathMatchesRule(path, a) && a.length > longestAllow.length) longestAllow = a
    let longestDisallow = ''
    for (const d of robots.disallow) if (pathMatchesRule(path, d) && d.length > longestDisallow.length) longestDisallow = d
    if (longestAllow.length >= longestDisallow.length) return true
    return false
  } catch {
    return true
  }
}

export async function getRobotsForDomain(domain: string): Promise<RobotsRules | null> {
  if (!RESPECT_ROBOTS) return null
  const host = domain.replace(/\/$/, '')
  const robotsUrl = /^https?:\/\//.test(host) ? `${host}/robots.txt` : `https://${host}/robots.txt`
  // cache lookup
  const cached = await prisma.robotsCache.findUnique({ where: { domain: host } })
  if (cached) {
    return parseRobots(cached.content)
  }
  try {
    const res = await httpFetch(robotsUrl, { method: 'GET', headers: { accept: 'text/plain' } })
    if (!res.ok) return null
    const text = await res.text()
    await prisma.robotsCache.create({ data: { domain: host, content: text } })
    return parseRobots(text)
  } catch {
    return null
  }
}
