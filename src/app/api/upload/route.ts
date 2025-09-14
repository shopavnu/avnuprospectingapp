import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/server/db'

const RowSchema = z.object({
  merchant_name: z.string().min(1),
  domain: z.string().trim().optional().nullable(),
  instagram_username: z.string().trim().optional().nullable(),
  return_policy_url: z.string().url().optional().nullable(),
  shipping_policy_url: z.string().url().optional().nullable(),
  google_brand_query: z.string().trim().optional().nullable(),
})

const PayloadSchema = z.object({
  rows: z.array(RowSchema).min(1),
})

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const { rows } = PayloadSchema.parse(json)

    const results: { name: string; id: string }[] = []

    for (const r of rows) {
      const name = r.merchant_name.trim()
      const domain = r.domain?.trim() || null
      const instagramUsername = r.instagram_username?.trim() || null
      const googleBrandQuery = r.google_brand_query?.trim() || null

      const brand = await prisma.brand.create({
        data: {
          name,
          domain,
          status: 'pending',
          instagramUsername,
          googleBrandQuery,
        },
        select: { id: true },
      })

      // If policy URLs provided, create placeholder snapshot
      if (r.return_policy_url || r.shipping_policy_url) {
        await prisma.policySnapshot.create({
          data: {
            brandId: brand.id,
            returnPolicyUrl: r.return_policy_url || null,
            shippingPolicyUrl: r.shipping_policy_url || null,
          },
        })
      }

      results.push({ name, id: brand.id })
    }

    return new Response(JSON.stringify({ ok: true, inserted: results.length, items: results }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Upload error', err)
    const msg = err?.message || 'Invalid payload'
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }
}
