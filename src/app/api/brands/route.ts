import { prisma } from '@/server/db'

export async function GET() {
  const brands = await prisma.brand.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      domain: true,
      status: true,
      shopifyDetected: true,
      notes: true,
      createdAt: true,
      instagramUsername: true,
      instagramLastPostAt: true,
      instagramActive30d: true,
      instagramSource: true,
      instagramError: true,
      _count: { select: { products: true, contactEmails: true } },
      aggregate: {
        select: {
          productCount: true,
          sumReviewCount: true,
          weightedAvgRating: true,
          simpleAvgRating: true,
          medianRating: true,
          minRating: true,
          maxRating: true,
          computedAt: true,
        },
      },
      policy: {
        select: {
          returnPolicyUrl: true,
          returnWindowDays: true,
          shippingPolicyUrl: true,
          shippingFree: true,
          shippingAlwaysFree: true,
          shippingFreeThreshold: true,
          shippingCurrency: true,
          computedAt: true,
        },
      },
    },
  })
  return new Response(JSON.stringify({ ok: true, items: brands }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
