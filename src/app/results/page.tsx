"use client"

import React from 'react'
import { useEffect, useMemo, useState } from 'react'

type BrandRow = {
  id: string
  name: string
  domain: string | null
  shopifyDetected?: boolean | null
  instagramActive30d?: boolean | null
  _count?: { products?: number; contactEmails?: number }
  aggregate?: {
    productCount: number | null
    sumReviewCount: number | null
    weightedAvgRating: number | null
    simpleAvgRating: number | null
    medianRating: number | null
    minRating: number | null
    maxRating: number | null
    computedAt: string
  } | null
  policy?: {
    returnPolicyUrl?: string | null
    returnWindowDays?: number | null
    shippingPolicyUrl?: string | null
    shippingFree?: boolean | null
    shippingAlwaysFree?: boolean | null
    shippingFreeThreshold?: number | null
    shippingCurrency?: string | null
    computedAt?: string | null
  } | null
}

export default function ResultsPage() {
  const [brands, setBrands] = useState<BrandRow[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [minWeighted, setMinWeighted] = useState<string>('')
  const [minReviews, setMinReviews] = useState<string>('')
  const [igActiveOnly, setIgActiveOnly] = useState(false)
  const [shippingFree, setShippingFree] = useState<'any' | 'free' | 'always_free' | 'threshold'>('any')
  const [minReturnDays, setMinReturnDays] = useState<string>('')
  const [exportBrandId, setExportBrandId] = useState<string>('')

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch('/api/brands')
      const data = await res.json()
      if (data?.ok) setBrands(data.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const filtered = useMemo(() => {
    let rows = brands
    const minW = minWeighted ? parseFloat(minWeighted) : undefined
    const minR = minReviews ? parseInt(minReviews, 10) : undefined
    const minRet = minReturnDays ? parseInt(minReturnDays, 10) : undefined

    if (minW != null && !Number.isNaN(minW)) {
      rows = rows.filter((b) => (b.aggregate?.weightedAvgRating ?? -Infinity) >= minW)
    }
    if (minR != null && !Number.isNaN(minR)) {
      rows = rows.filter((b) => (b.aggregate?.sumReviewCount ?? 0) >= minR)
    }
    if (igActiveOnly) {
      rows = rows.filter((b) => b.instagramActive30d === true)
    }
    if (shippingFree !== 'any') {
      rows = rows.filter((b) => {
        const p = b.policy
        if (!p) return false
        if (shippingFree === 'always_free') return p.shippingAlwaysFree === true
        if (shippingFree === 'free') return p.shippingFree === true
        if (shippingFree === 'threshold') return (p.shippingFreeThreshold ?? 0) > 0
        return true
      })
    }
    if (minRet != null && !Number.isNaN(minRet)) {
      rows = rows.filter((b) => (b.policy?.returnWindowDays ?? 0) >= minRet)
    }
    return rows
  }, [brands, minWeighted, minReviews, igActiveOnly, shippingFree, minReturnDays])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Results</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-sm text-gray-700">Min weighted rating</label>
          <input value={minWeighted} onChange={(e) => setMinWeighted(e.target.value)} placeholder="e.g. 4.2"
            className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Min total reviews</label>
          <input value={minReviews} onChange={(e) => setMinReviews(e.target.value)} placeholder="e.g. 500"
            className="border rounded px-2 py-1 w-full" />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Min return window (days)</label>
          <input value={minReturnDays} onChange={(e) => setMinReturnDays(e.target.value)} placeholder="e.g. 30"
            className="border rounded px-2 py-1 w-full" />
        </div>
        <div className="flex items-center gap-2">
          <input id="igOnly" type="checkbox" checked={igActiveOnly} onChange={(e) => setIgActiveOnly(e.target.checked)} />
          <label htmlFor="igOnly" className="text-sm">IG active in last 30d</label>
        </div>
        <div>
          <label className="block text-sm text-gray-700">Shipping</label>
          <select value={shippingFree} onChange={(e) => setShippingFree(e.target.value as any)} className="border rounded px-2 py-1 w-full">
            <option value="any">Any</option>
            <option value="free">Free exists</option>
            <option value="always_free">Always free</option>
            <option value="threshold">Free over threshold</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a href="/api/export/brands" className="bg-black text-white px-4 py-2 rounded">Export brands CSV</a>
        <div className="flex items-center gap-2">
          <select value={exportBrandId} onChange={(e) => setExportBrandId(e.target.value)} className="border rounded px-2 py-1">
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <a
            href={`/api/export/products${exportBrandId ? `?brandId=${exportBrandId}` : ''}`}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >Export products CSV</a>
        </div>
        <button onClick={refresh} className="px-3 py-2 border rounded">Refresh</button>
      </div>

      <div className="border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-2 px-3">Brand</th>
              <th className="py-2 px-3">Domain</th>
              <th className="py-2 px-3">Products</th>
              <th className="py-2 px-3">Sum Reviews</th>
              <th className="py-2 px-3">Weighted Avg</th>
              <th className="py-2 px-3">Return Window</th>
              <th className="py-2 px-3">Shipping</th>
              <th className="py-2 px-3">IG Active</th>
              <th className="py-2 px-3">Shopify</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="py-3 px-3" colSpan={9}>Loading…</td></tr>
            )}
            {!loading && filtered.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="py-2 px-3">{b.name}</td>
                <td className="py-2 px-3">{b.domain || ''}</td>
                <td className="py-2 px-3">{b.aggregate?.productCount ?? b._count?.products ?? 0}</td>
                <td className="py-2 px-3">{b.aggregate?.sumReviewCount ?? 0}</td>
                <td className="py-2 px-3">{b.aggregate?.weightedAvgRating ?? '—'}</td>
                <td className="py-2 px-3">{b.policy?.returnWindowDays ?? '—'}</td>
                <td className="py-2 px-3">
                  {b.policy?.shippingAlwaysFree ? 'Always free' : (b.policy?.shippingFree ? 'Free' : (b.policy?.shippingFreeThreshold ? `Free over ${b.policy?.shippingCurrency || ''}${b.policy?.shippingFreeThreshold}` : '—'))}
                </td>
                <td className="py-2 px-3">{b.instagramActive30d ? 'Yes' : 'No'}</td>
                <td className="py-2 px-3">{b.shopifyDetected === true ? 'Yes' : (b.shopifyDetected === false ? 'No' : '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
