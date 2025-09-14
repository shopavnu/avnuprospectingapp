import Link from 'next/link'

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-semibold">Product Ratings Snapshot</h1>
      <p className="text-gray-700">Use the actions below to upload brands, run discovery/extraction, and view results.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/upload" className="block rounded border px-4 py-6 hover:bg-gray-50">
          <div className="font-medium">Upload</div>
          <div className="text-sm text-gray-600">Import your brands CSV</div>
        </Link>

        <Link href="/run" className="block rounded border px-4 py-6 hover:bg-gray-50">
          <div className="font-medium">Run</div>
          <div className="text-sm text-gray-600">Resolve domains, discover products, extract ratings, parse policies, enrich IG/emails, aggregate</div>
        </Link>

        <Link href="/results" className="block rounded border px-4 py-6 hover:bg-gray-50">
          <div className="font-medium">Results</div>
          <div className="text-sm text-gray-600">Filter and export CSVs</div>
        </Link>
      </div>
    </div>
  );
}
