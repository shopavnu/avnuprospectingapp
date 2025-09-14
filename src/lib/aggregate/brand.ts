import { prisma } from '@/server/db'

export type AggregateResult = {
  brandId: string
  productCount: number
  sumReviewCount: number
  weightedAvgRating: number | null
  simpleAvgRating: number | null
  medianRating: number | null
  minRating: number | null
  maxRating: number | null
}

export async function computeBrandAggregate(brandId: string): Promise<AggregateResult | null> {
  const samples = await prisma.productSample.findMany({
    where: { brandId },
    select: { ratingValue: true, reviewCount: true },
  })
  if (!samples.length) return null

  const ratings = samples
    .map((s) => (typeof s.ratingValue === 'number' ? s.ratingValue : null))
    .filter((x): x is number => x != null)

  const counts = samples
    .map((s) => (typeof s.reviewCount === 'number' ? s.reviewCount : 0))

  const productCount = samples.length
  const sumReviewCount = counts.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0)

  const simpleAvgRating = ratings.length ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(3)) : null

  const sorted = [...ratings].sort((a, b) => a - b)
  let medianRating: number | null = null
  if (sorted.length) {
    const mid = Math.floor(sorted.length / 2)
    medianRating = sorted.length % 2 ? sorted[mid] : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(3))
  }

  const minRating = sorted.length ? sorted[0] : null
  const maxRating = sorted.length ? sorted[sorted.length - 1] : null

  // weighted average by reviewCount; ignore rows with null rating or null count
  let weightedAvgRating: number | null = null
  const pairs = samples
    .filter((s) => typeof s.ratingValue === 'number' && typeof s.reviewCount === 'number')
    .map((s) => ({ r: s.ratingValue as number, c: s.reviewCount as number }))
  const totalC = pairs.reduce((a, b) => a + b.c, 0)
  if (totalC > 0) {
    const sumRC = pairs.reduce((a, b) => a + b.r * b.c, 0)
    weightedAvgRating = Number((sumRC / totalC).toFixed(3))
  }

  await prisma.brandAggregate.upsert({
    where: { brandId },
    create: {
      brandId,
      productCount,
      sumReviewCount,
      weightedAvgRating,
      simpleAvgRating,
      medianRating,
      minRating,
      maxRating,
      computedAt: new Date(),
    },
    update: {
      productCount,
      sumReviewCount,
      weightedAvgRating,
      simpleAvgRating,
      medianRating,
      minRating,
      maxRating,
      computedAt: new Date(),
    },
  })

  return { brandId, productCount, sumReviewCount, weightedAvgRating, simpleAvgRating, medianRating, minRating, maxRating }
}
