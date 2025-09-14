export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { httpFetch } from '@/lib/crawl/fetcher'
import { getRobotsForDomain, isAllowed } from '@/lib/crawl/robots'
import { extractProductRating } from '@/lib/parse/ratings'

const BodySchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { limit } = BodySchema.parse(body)

  // Pull products that have not yet been rated
  const products = await prisma.productSample.findMany({
    where: { OR: [{ ratingValue: null }, { reviewCount: null }] },
    orderBy: { fetchedAt: 'asc' },
    take: limit,
    select: { id: true, url: true, brandId: true, brand: { select: { domain: true } } },
  })

  const results: Array<{ id: string; url: string; status: 'ok' | 'skipped' | 'error'; reason?: string }>
    = []

  for (const p of products) {
    try {
      const origin = (p.brand?.domain || '').replace(/\/$/, '')
      const robots = origin ? await getRobotsForDomain(origin).catch(() => null) : null
      if (robots && !isAllowed(p.url, robots)) {
        results.push({ id: p.id, url: p.url, status: 'skipped', reason: 'robots' })
        continue
      }
      const res = await httpFetch(p.url, { method: 'GET' })
      if (!res.ok) {
        results.push({ id: p.id, url: p.url, status: 'error', reason: `status ${res.status}` })
        continue
      }
      const html = await res.text()
      const extracted = extractProductRating(html, p.url)
      if (!extracted) {
        // update timestamp to avoid reprocessing immediately
        await prisma.productSample.update({ where: { id: p.id }, data: { fetchedAt: new Date() } })
        results.push({ id: p.id, url: p.url, status: 'skipped', reason: 'no_rating' })
        continue
      }
      await prisma.productSample.update({
        where: { id: p.id },
        data: {
          title: extracted.title || undefined,
          ratingValue: extracted.ratingValue ?? undefined,
          reviewCount: extracted.reviewCount ?? undefined,
          widget: extracted.widget || undefined,
          source: extracted.source as any,
          rawEvidence: extracted.evidence || undefined,
          fetchedAt: new Date(),
        },
      })
      results.push({ id: p.id, url: p.url, status: 'ok' })
    } catch (e: any) {
      results.push({ id: p.id, url: p.url, status: 'error', reason: e?.message || 'error' })
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: products.length, items: results }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
