import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { getRobotsForDomain, isAllowed } from '@/lib/crawl/robots'
import { fetchHtml, discoverPolicyLinks } from '@/lib/crawl/policies'
import { parseReturnPolicy, parseShippingPolicy } from '@/lib/parse/policies'

const BodySchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(15),
})

function originFrom(urlOrHost: string): string {
  const hasProto = /^https?:\/\//.test(urlOrHost)
  const u = new URL(hasProto ? urlOrHost : `https://${urlOrHost}`)
  return `${u.protocol}//${u.host}`
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { limit } = BodySchema.parse(body)

  // Pick brands that have a domain and either no policy record or a record missing fields
  const brands = await prisma.brand.findMany({
    where: { domain: { not: null } },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      name: true,
      domain: true,
      policy: {
        select: {
          id: true,
          returnPolicyUrl: true,
          returnWindowDays: true,
          shippingPolicyUrl: true,
          shippingFree: true,
          shippingAlwaysFree: true,
          shippingFreeThreshold: true,
          shippingCurrency: true,
          notes: true,
          evidence: true,
        },
      },
    },
  })

  const items: any[] = []

  for (const b of brands) {
    const origin = originFrom(b.domain as string)
    const robots = await getRobotsForDomain(origin).catch(() => null)

    // Ensure policy record exists
    let policy = b.policy
    if (!policy) {
      policy = await prisma.policySnapshot.create({ data: { brandId: b.id } })
    }

    // Determine URLs: prefer existing URLs on record, else discover from homepage
    let returnUrl = policy.returnPolicyUrl || undefined
    let shippingUrl = policy.shippingPolicyUrl || undefined
    if (!returnUrl || !shippingUrl) {
      const homepageHtml = robots && !isAllowed(origin, robots) ? null : await fetchHtml(origin)
      if (homepageHtml) {
        const discovered = discoverPolicyLinks(origin, homepageHtml)
        if (!returnUrl) returnUrl = discovered.returnUrl
        if (!shippingUrl) shippingUrl = discovered.shippingUrl
      }
    }

    let retParsed: any = null
    if (returnUrl && (!robots || isAllowed(returnUrl, robots))) {
      const html = await fetchHtml(returnUrl)
      if (html) retParsed = parseReturnPolicy(html)
    }

    let shipParsed: any = null
    if (shippingUrl && (!robots || isAllowed(shippingUrl, robots))) {
      const html = await fetchHtml(shippingUrl)
      if (html) shipParsed = parseShippingPolicy(html)
    }

    await prisma.policySnapshot.update({
      where: { brandId: b.id },
      data: {
        returnPolicyUrl: returnUrl || undefined,
        returnWindowDays: retParsed?.returnWindowDays ?? undefined,
        shippingPolicyUrl: shippingUrl || undefined,
        shippingFree: shipParsed?.shippingFree ?? undefined,
        shippingAlwaysFree: shipParsed?.shippingAlwaysFree ?? undefined,
        shippingFreeThreshold: shipParsed?.shippingFreeThreshold ?? undefined,
        shippingCurrency: shipParsed?.shippingCurrency ?? undefined,
        notes: [policy?.notes, retParsed?.notes, shipParsed?.notes].filter(Boolean).join(' ').trim() || undefined,
        evidence: [retParsed?.evidence, shipParsed?.evidence].filter(Boolean).join('\n').slice(0, 800) || undefined,
        computedAt: new Date(),
      },
    })

    items.push({ id: b.id, name: b.name, returnUrl, shippingUrl })
  }

  return new Response(JSON.stringify({ ok: true, processed: brands.length, items }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
