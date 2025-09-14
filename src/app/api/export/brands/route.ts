export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
import { prisma } from '@/server/db'

function toCsvValue(v: any): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export async function GET() {
  const rows = await prisma.brand.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      domain: true,
      shopifyDetected: true,
      instagramUsername: true,
      instagramLastPostAt: true,
      instagramActive30d: true,
      aggregate: {
        select: {
          productCount: true,
          sumReviewCount: true,
          weightedAvgRating: true,
          simpleAvgRating: true,
          medianRating: true,
          minRating: true,
          maxRating: true,
        },
      },
      policy: {
        select: {
          returnWindowDays: true,
          shippingFree: true,
          shippingAlwaysFree: true,
          shippingFreeThreshold: true,
          shippingCurrency: true,
        },
      },
    },
  })

  const headers = [
    'brandId','brandName','domain','shopifyDetected','instagramUsername','instagramLastPostAt','instagramActive30d',
    'productCount','sumReviewCount','weightedAvgRating','simpleAvgRating','medianRating','minRating','maxRating',
    'returnWindowDays','shippingFree','shippingAlwaysFree','shippingFreeThreshold','shippingCurrency'
  ]

  const csv = [
    headers.join(','),
    ...rows.map((r) => [
      r.id,
      r.name,
      r.domain ?? '',
      r.shopifyDetected ?? '',
      r.instagramUsername ?? '',
      r.instagramLastPostAt ? new Date(r.instagramLastPostAt).toISOString() : '',
      r.instagramActive30d ?? '',
      r.aggregate?.productCount ?? '',
      r.aggregate?.sumReviewCount ?? '',
      r.aggregate?.weightedAvgRating ?? '',
      r.aggregate?.simpleAvgRating ?? '',
      r.aggregate?.medianRating ?? '',
      r.aggregate?.minRating ?? '',
      r.aggregate?.maxRating ?? '',
      r.policy?.returnWindowDays ?? '',
      r.policy?.shippingFree ?? '',
      r.policy?.shippingAlwaysFree ?? '',
      r.policy?.shippingFreeThreshold ?? '',
      r.policy?.shippingCurrency ?? '',
    ].map(toCsvValue).join(',')).join('\n'),
  ].join('\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="brands.csv"',
      'cache-control': 'no-store',
    },
  })
}
