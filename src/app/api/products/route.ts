import { prisma } from '@/server/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brandId = searchParams.get('brandId') || undefined
  const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10) || 200, 1000)

  const items = await prisma.productSample.findMany({
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

  return new Response(JSON.stringify({ ok: true, items }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
