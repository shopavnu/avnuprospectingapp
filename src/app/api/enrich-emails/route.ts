export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'
import { getRobotsForDomain } from '@/lib/crawl/robots'
import { findEmailsForOrigin } from '@/lib/email/discover'
import { isMillionVerifierEnabled, verifyWithMillionVerifier } from '@/lib/enrich/millionverifier'

const BodySchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(15),
  brandIds: z.array(z.string().min(1)).optional().default([]),
})

function originFrom(domainOrUrl: string): string {
  const hasProto = /^https?:\/\//.test(domainOrUrl)
  const u = new URL(hasProto ? domainOrUrl : `https://${domainOrUrl}`)
  return `${u.protocol}//${u.host}`
}

const DAY = 24 * 60 * 60 * 1000
const VERIFY_TTL_MS = 90 * DAY

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { limit, brandIds } = BodySchema.parse(body)

  const brands = await prisma.brand.findMany({
    where: {
      domain: { not: null },
      ...(brandIds && brandIds.length ? { id: { in: brandIds } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: { id: true, name: true, domain: true },
  })

  const items: any[] = []
  const now = Date.now()
  const mvOn = isMillionVerifierEnabled()

  for (const b of brands) {
    const origin = originFrom(b.domain as string)
    const robots = await getRobotsForDomain(origin).catch(() => null)

    // Discover emails on-site
    const found = await findEmailsForOrigin(origin, robots)

    // Fetch existing emails for brand
    const existing = await prisma.contactEmail.findMany({ where: { brandId: b.id } })
    const existingByAddress = new Map(existing.map((e) => [e.address.toLowerCase(), e]))

    // Upsert new findings
    for (const f of found) {
      const lower = f.address.toLowerCase()
      const prev = existingByAddress.get(lower)
      if (!prev) {
        const created = await prisma.contactEmail.create({
          data: {
            brandId: b.id,
            address: lower,
            type: f.type,
            sourceUrl: f.sourceUrl,
            verifiedSyntax: f.verifiedSyntax,
            verifiedMx: f.verifiedMx,
            evidence: f.evidence?.slice(0, 500),
          },
        })
        existingByAddress.set(lower, created)
      } else {
        // Update evidence/sourceUrl if empty
        if (!prev.sourceUrl || !prev.evidence) {
          await prisma.contactEmail.update({
            where: { id: prev.id },
            data: {
              sourceUrl: prev.sourceUrl || f.sourceUrl,
              evidence: prev.evidence || f.evidence?.slice(0, 500),
            },
          })
        }
      }
    }

    // Refresh existing after potential inserts
    const emails = await prisma.contactEmail.findMany({ where: { brandId: b.id } })

    // Optional DeBounce verification for personal emails only and only if syntax+MX
    if (mvOn) {
      for (const ce of emails) {
        if (ce.type !== 'personal') continue
        if (!ce.verifiedSyntax || !ce.verifiedMx) continue
        const age = ce.verifiedAt ? now - new Date(ce.verifiedAt).getTime() : Number.POSITIVE_INFINITY
        if (age < VERIFY_TTL_MS && ce.verificationStatus) continue
        const v = await verifyWithMillionVerifier(ce.address)
        await prisma.contactEmail.update({
          where: { id: ce.id },
          data: {
            verifiedService: v.provider || undefined,
            verificationStatus: v.status,
            verificationScore: v.score ?? undefined,
            verifiedAt: new Date(),
          },
        })
      }
    }

    const count = await prisma.contactEmail.count({ where: { brandId: b.id } })
    items.push({ id: b.id, name: b.name, emails: count })
  }

  return new Response(JSON.stringify({ ok: true, processed: items.length, items }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
