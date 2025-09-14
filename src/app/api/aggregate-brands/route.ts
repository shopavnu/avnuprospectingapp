export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { computeBrandAggregate } from '@/lib/aggregate/brand'

const BodySchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(25),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { limit } = BodySchema.parse(body)

  // Find brands that have at least 1 product sample
  const brands = await prisma.brand.findMany({
    orderBy: { createdAt: 'asc' },
    take: limit,
    where: {
      products: { some: {} },
    },
    select: { id: true, name: true },
  })

  const items: any[] = []
  for (const b of brands) {
    const agg = await computeBrandAggregate(b.id)
    items.push({ id: b.id, name: b.name, aggregate: agg })
  }

  return new Response(JSON.stringify({ ok: true, processed: brands.length, items }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
