import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { getInstagramLastPost } from '@/lib/enrich/instagram'

const BodySchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(20),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { limit } = BodySchema.parse(body)

  // Brands with instagramUsername and not computed recently, or missing lastPostAt
  const brands = await prisma.brand.findMany({
    where: { instagramUsername: { not: null } },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      name: true,
      instagramUsername: true,
    },
  })

  const items: any[] = []
  const now = Date.now()
  const LOOKBACK_DAYS = Number(process.env.IG_LOOKBACK_DAYS || 30)
  const lookbackMs = LOOKBACK_DAYS * 24 * 60 * 60 * 1000

  for (const b of brands) {
    const username = (b.instagramUsername || '').trim()
    if (!username) continue

    const result = await getInstagramLastPost(username)
    const last = result.lastPostAt || null
    const active = last ? now - last.getTime() <= lookbackMs : false

    await prisma.brand.update({
      where: { id: b.id },
      data: {
        instagramLastPostAt: last || undefined,
        instagramActive30d: active,
        instagramSource: result.source,
        instagramError: result.error || undefined,
      },
    })

    items.push({ id: b.id, name: b.name, username, lastPostAt: last, active })
  }

  return new Response(JSON.stringify({ ok: true, processed: items.length, items }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
