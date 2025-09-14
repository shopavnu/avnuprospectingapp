export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { discoverProductUrls } from '@/lib/crawl/sitemaps'

const BodySchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(10),
  maxPerBrand: z.number().int().min(1).max(50).optional().default(50),
  brandIds: z.array(z.string().min(1)).optional().default([]),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { limit, maxPerBrand, brandIds } = BodySchema.parse(body)

  // Pull brands that have a domain and still need product discovery
  const brands = await prisma.brand.findMany({
    where: {
      domain: { not: null },
      ...(brandIds && brandIds.length ? { id: { in: brandIds } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true, name: true, domain: true, _count: { select: { products: true } } },
  })

  const results: Array<{ id: string; name: string; discovered: number; inserted: number }> = []

  for (const b of brands) {
    const origin = b.domain as string
    const existingCount = b._count.products
    const slots = Math.max(0, maxPerBrand - existingCount)
    if (slots === 0) {
      results.push({ id: b.id, name: b.name, discovered: 0, inserted: 0 })
      continue
    }

    // Discover candidates (may contain duplicates vs existing)
    const candidates = await discoverProductUrls(origin, maxPerBrand)

    // Load current URLs for this brand to avoid duplicates
    const existing = await prisma.productSample.findMany({
      where: { brandId: b.id },
      select: { url: true },
    })
    const existingSet = new Set(existing.map((e) => e.url))

    const newUrls: string[] = []
    for (const u of candidates) {
      if (!existingSet.has(u)) newUrls.push(u)
      if (newUrls.length >= slots) break
    }

    let inserted = 0
    if (newUrls.length > 0) {
      const data = newUrls.map((url) => ({ brandId: b.id, url, source: 'dom' as any }))
      const res = await prisma.productSample.createMany({ data })
      inserted = res.count
    }

    results.push({ id: b.id, name: b.name, discovered: candidates.length, inserted })
  }

  return new Response(JSON.stringify({ ok: true, processed: brands.length, items: results }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
