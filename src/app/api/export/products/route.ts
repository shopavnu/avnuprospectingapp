import { prisma } from '@/server/db'

function toCsvValue(v: any): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId') || undefined
  const limit = Math.min(parseInt(searchParams.get('limit') || '5000', 10) || 5000, 20000)

  const rows = await prisma.productSample.findMany({
    where: brandId ? { brandId } : undefined,
    orderBy: { fetchedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      brandId: true,
      url: true,
      title: true,
      ratingValue: true,
      reviewCount: true,
      widget: true,
      source: true,
      fetchedAt: true,
      brand: { select: { name: true } },
    },
  })

  const headers = [
    'productId','brandId','brandName','url','title','ratingValue','reviewCount','widget','source','fetchedAt'
  ]

  const csv = [
    headers.join(','),
    ...rows.map((r) => [
      r.id,
      r.brandId,
      r.brand?.name ?? '',
      r.url,
      r.title ?? '',
      r.ratingValue ?? '',
      r.reviewCount ?? '',
      r.widget ?? '',
      r.source ?? '',
      r.fetchedAt ? new Date(r.fetchedAt).toISOString() : '',
    ].map(toCsvValue).join(',')).join('\n'),
  ].join('\n')

  return new Response(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="products.csv"',
      'cache-control': 'no-store',
    },
  })
}
