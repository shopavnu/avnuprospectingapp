'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import Link from 'next/link'

// Expected CSV headers (case-insensitive):
// merchant_name, domain (optional), instagram_username (optional),
// return_policy_url (optional), shipping_policy_url (optional), google_brand_query (optional)

type CsvRow = {
  merchant_name: string
  domain?: string | null
  instagram_username?: string | null
  return_policy_url?: string | null
  shipping_policy_url?: string | null
  google_brand_query?: string | null
}

export default function UploadPage() {
  const [rows, setRows] = useState<CsvRow[]>([])
  const [log, setLog] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  function parseCsv(file: File) {
    setLog('Parsing CSV...')
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => {
        const cleaned: CsvRow[] = (results.data || [])
          .map((r) => ({
            merchant_name: (r as any).merchant_name?.toString() ?? '',
            domain: (r as any).domain?.toString() ?? null,
            instagram_username: (r as any).instagram_username?.toString() ?? null,
            return_policy_url: (r as any).return_policy_url?.toString() ?? null,
            shipping_policy_url: (r as any).shipping_policy_url?.toString() ?? null,
            google_brand_query: (r as any).google_brand_query?.toString() ?? null,
          }))
          .filter((r) => r.merchant_name && r.merchant_name.trim().length > 0)
        setRows(cleaned)
        setLog(`Parsed ${cleaned.length} row(s).`)
      },
      error: (err) => {
        setLog(`Parse error: ${err.message}`)
      },
    })
  }

  async function handleSubmit() {
    if (!rows.length) {
      setLog('No rows to submit.')
      return
    }
    setSubmitting(true)
    setLog('Submitting...')
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload failed')
      setLog(`Inserted ${data.inserted} brand(s).`)
    } catch (e: any) {
      setLog(`Error: ${e.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Upload Brands CSV</h1>

      <div className="space-y-3">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) parseCsv(f)
          }}
          className="block"
        />
        <p className="text-sm text-gray-600">
          Required column: <code>merchant_name</code>. Optional: <code>domain</code>, <code>instagram_username</code>, <code>return_policy_url</code>, <code>shipping_policy_url</code>, <code>google_brand_query</code>.
        </p>
      </div>

      {rows.length > 0 && (
        <div className="border rounded p-4">
          <div className="mb-2 text-sm text-gray-700">Preview (first 10 rows)</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-1 pr-2">merchant_name</th>
                <th className="py-1 pr-2">domain</th>
                <th className="py-1 pr-2">instagram_username</th>
                <th className="py-1 pr-2">return_policy_url</th>
                <th className="py-1 pr-2">shipping_policy_url</th>
                <th className="py-1 pr-2">google_brand_query</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1 pr-2">{r.merchant_name}</td>
                  <td className="py-1 pr-2">{r.domain || ''}</td>
                  <td className="py-1 pr-2">{r.instagram_username || ''}</td>
                  <td className="py-1 pr-2">{r.return_policy_url || ''}</td>
                  <td className="py-1 pr-2">{r.shipping_policy_url || ''}</td>
                  <td className="py-1 pr-2">{r.google_brand_query || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          disabled={submitting || rows.length === 0}
          onClick={handleSubmit}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
        <span className="text-sm text-gray-700">{log}</span>
      </div>

      {log.startsWith('Inserted') && (
        <div className="flex items-center gap-3">
          <Link href="/run" className="bg-blue-600 text-white px-4 py-2 rounded">Proceed to Run</Link>
          <Link href="/results" className="bg-green-600 text-white px-4 py-2 rounded">View Results</Link>
        </div>
      )}
    </div>
  )
}
