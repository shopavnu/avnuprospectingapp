'use client'

import { useEffect, useState } from 'react'

type Brand = {
  id: string
  name: string
  domain: string | null
  status: 'pending' | 'processing' | 'done' | 'error'
  shopifyDetected?: boolean | null
  notes?: string | null
  createdAt: string
  instagramUsername?: string | null
  instagramLastPostAt?: string | null
  instagramActive30d?: boolean
  instagramSource?: string | null
}

export default function RunPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [aggregating, setAggregating] = useState(false)
  const [policiesLoading, setPoliciesLoading] = useState(false)
  const [igLoading, setIgLoading] = useState(false)
  const [emailsLoading, setEmailsLoading] = useState(false)

  async function refresh() {
    try {
      const res = await fetch('/api/brands')
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        setLog(`Brands API error ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`)
        return
      }
      const data = await res.json()
      if (data?.ok) setBrands(data.items)
    } catch (e: any) {
      setLog(`Brands API error: ${e?.message || 'unknown error'}`)
    }
  }

  async function discoverEmails() {
    setEmailsLoading(true)
    setLog('Discovering on-site emails for up to 15 brands...')
    try {
      const res = await fetch('/api/enrich-emails', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 15 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Email discovery failed')
      setLog(`Processed ${data.processed} brand(s).`)
      await refresh()
    } catch (e: any) {
      setLog(`Error: ${e.message}`)
    } finally {
      setEmailsLoading(false)
    }
  }

  async function enrichInstagram() {
    setIgLoading(true)
    setLog('Enriching Instagram activity for up to 20 brands...')
    try {
      const res = await fetch('/api/enrich-instagram', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Instagram failed')
      setLog(`Enriched ${data.processed} brand(s).`)
      await refresh()
    } catch (e: any) {
      setLog(`Error: ${e.message}`)
    } finally {
      setIgLoading(false)
    }
  }

  async function parsePolicies() {
    setPoliciesLoading(true)
    setLog('Parsing policies for up to 15 brands...')
    try {
      const res = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 15 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Policies failed')
      setLog(`Parsed policies for ${data.processed} brand(s).`)
      await refresh()
    } catch (e: any) {
      setLog(`Error: ${e.message}`)
    } finally {
      setPoliciesLoading(false)
    }
  }

  async function aggregateBrands() {
    setAggregating(true)
    setLog('Aggregating brand metrics for up to 25 brands...')
    try {
      const res = await fetch('/api/aggregate-brands', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 25 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Aggregate failed')
      setLog(`Aggregated ${data.processed} brand(s).`)
      await refresh()
    } catch (e: any) {
      setLog(`Error: ${e.message}`)
    } finally {
      setAggregating(false)
    }
  }

  async function extractRatings() {
    setExtracting(true)
    setLog('Extracting ratings for up to 50 products...')
    try {
      const res = await fetch('/api/extract-ratings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 50 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Extract failed')
      setLog(`Extracted for ${data.processed} product(s).`)
      await refresh()
    } catch (e: any) {
      setLog(`Error: ${e.message}`)
    } finally {
      setExtracting(false)
    }
  }

  async function discoverProducts() {
    setDiscovering(true)
    setLog('Discovering up to 50 product URLs per brand (batch of 10)...')
    try {
      const res = await fetch('/api/discover-products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 10, maxPerBrand: 50 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Discovery failed')
      setLog(`Discovered for ${data.processed} brand(s).`)
      await refresh()
    } catch (e: any) {
      setLog(`Error: ${e.message}`)
    } finally {
      setDiscovering(false)
    }
  }

  async function resolveDomains() {
    setLoading(true)
    setLog('Resolving domains for up to 20 pending brands...')
    try {
      const res = await fetch('/api/resolve-domains', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 20 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Resolve failed')
      setLog(`Processed ${data.processed} brand(s).`)
      await refresh()
    } catch (e: any) {
      setLog(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Run: Domain Resolution & Shopify Check</h1>
      <p className="text-sm text-gray-600">This step normalizes domains, detects Shopify, caches robots.txt, and discovers product URLs.</p>

      <div className="flex items-center gap-3">
        <button
          onClick={resolveDomains}
          disabled={loading}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Resolving…' : 'Resolve domains (20)'}
        </button>
        <button
          onClick={discoverProducts}
          disabled={discovering}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {discovering ? 'Discovering…' : 'Discover products (10 brands)'}
        </button>
        <button
          onClick={extractRatings}
          disabled={extracting}
          className="bg-emerald-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {extracting ? 'Extracting…' : 'Extract ratings (50 products)'}
        </button>
        <button
          onClick={enrichInstagram}
          disabled={igLoading}
          className="bg-pink-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {igLoading ? 'Enriching…' : 'Enrich Instagram (20)'}
        </button>
        <button
          onClick={discoverEmails}
          disabled={emailsLoading}
          className="bg-cyan-700 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {emailsLoading ? 'Discovering…' : 'Discover emails (15)'}
        </button>
        <button
          onClick={parsePolicies}
          disabled={policiesLoading}
          className="bg-orange-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {policiesLoading ? 'Parsing…' : 'Parse policies (15)'}
        </button>
        <button
          onClick={aggregateBrands}
          disabled={aggregating}
          className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {aggregating ? 'Aggregating…' : 'Aggregate brands (25)'}
        </button>
        <span className="text-sm text-gray-700">{log}</span>
      </div>

      <div className="border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-2 px-3">Brand</th>
              <th className="py-2 px-3">Domain</th>
              <th className="py-2 px-3">Products</th>
              <th className="py-2 px-3">Emails</th>
              <th className="py-2 px-3">IG Username</th>
              <th className="py-2 px-3">IG Last Post</th>
              <th className="py-2 px-3">IG Active 30d</th>
              <th className="py-2 px-3">Shopify</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Notes</th>
              <th className="py-2 px-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="py-2 px-3">{b.name}</td>
                <td className="py-2 px-3">{b.domain || ''}</td>
                <td className="py-2 px-3">{(b as any)._count?.products ?? 0}</td>
                <td className="py-2 px-3">{(b as any)._count?.contactEmails ?? 0}</td>
                <td className="py-2 px-3">{b.instagramUsername || ''}</td>
                <td className="py-2 px-3">{b.instagramLastPostAt ? new Date(b.instagramLastPostAt).toLocaleDateString() : '—'}</td>
                <td className="py-2 px-3">{b.instagramActive30d ? <span className="text-green-700">Yes</span> : <span className="text-gray-500">No</span>}</td>
                <td className="py-2 px-3">
                  {b.shopifyDetected === true && (
                    <span className="inline-flex items-center gap-1 text-green-700">Yes</span>
                  )}
                  {b.shopifyDetected === false && (
                    <span className="inline-flex items-center gap-1 text-red-700">No</span>
                  )}
                  {b.shopifyDetected == null && <span className="text-gray-500">—</span>}
                </td>
                <td className="py-2 px-3">{b.status}</td>
                <td className="py-2 px-3">{b.notes || ''}</td>
                <td className="py-2 px-3">{new Date(b.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
