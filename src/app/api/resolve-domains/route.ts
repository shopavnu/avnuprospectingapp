import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { candidateHosts, testUrl } from '@/lib/crawl/domain'
import { getRobotsForDomain } from '@/lib/crawl/robots'

const BodySchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
})

function originFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}`
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { limit } = BodySchema.parse(body)

  // Fetch a batch of pending brands (or with unknown shopifyDetected)
  const brands = await prisma.brand.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  const results: any[] = []

  for (const b of brands) {
    let finalOrigin: string | null = null
    let shopifyDetected: boolean | null = null

    const candidates: string[] = []
    if (b.domain) {
      const hasProto = /^https?:\/\//.test(b.domain)
      candidates.push(hasProto ? b.domain : `https://${b.domain}`)
    } else {
      candidates.push(...candidateHosts(b.name))
    }

    for (const c of candidates) {
      const tested = await testUrl(c)
      if (tested && tested.ok) {
        const origin = originFromUrl(tested.finalUrl || c)
        finalOrigin = origin || c
        shopifyDetected = tested.shopify
        break
      }
    }

    if (finalOrigin) {
      // Cache robots (best-effort)
      await getRobotsForDomain(finalOrigin).catch(() => null)
      await prisma.brand.update({
        where: { id: b.id },
        data: {
          domain: finalOrigin,
          shopifyDetected: shopifyDetected ?? undefined,
          notes: shopifyDetected === true ? 'Shopify detected' : shopifyDetected === false ? 'Shopify not detected' : undefined,
        },
      })
      results.push({ id: b.id, name: b.name, domain: finalOrigin, shopifyDetected })
    } else {
      await prisma.brand.update({
        where: { id: b.id },
        data: { notes: 'Domain unresolved' },
      })
      results.push({ id: b.id, name: b.name, error: 'unresolved' })
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: brands.length, items: results }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
