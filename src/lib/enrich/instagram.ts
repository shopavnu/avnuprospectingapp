const APIFY_TOKEN = process.env.APIFY_TOKEN || ''

export type InstagramResult = {
  lastPostAt?: Date | null
  error?: string | null
  source: string
}

async function apifyRunInstagramScraper(username: string): Promise<InstagramResult> {
  if (!APIFY_TOKEN) {
    return { lastPostAt: null, error: 'APIFY_TOKEN missing', source: 'apify:instagram-scraper' }
  }

  // Start actor run with wait for finish to simplify
  const runUrl = new URL('https://api.apify.com/v2/acts/apify~instagram-scraper/runs')
  runUrl.searchParams.set('token', APIFY_TOKEN)
  runUrl.searchParams.set('waitForFinish', '60')

  const input = {
    directNavigation: true,
    maxRequestRetries: 1,
    resultsLimit: 1,
    proxy: { useApifyProxy: true },
    addParentData: false,
    searchType: 'user',
    usernames: [username],
    // Keep output small
    resultsType: 'posts',
  }

  try {
    const runRes = await fetch(runUrl.toString(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!runRes.ok) {
      return { lastPostAt: null, error: `apify run status ${runRes.status}` , source: 'apify:instagram-scraper' }
    }
    const runJson: any = await runRes.json()
    const datasetId: string | undefined = runJson?.data?.defaultDatasetId || runJson?.data?.defaultDatasetId
    if (!datasetId) {
      return { lastPostAt: null, error: 'apify missing dataset id', source: 'apify:instagram-scraper' }
    }
    const itemsUrl = new URL(`https://api.apify.com/v2/datasets/${datasetId}/items`)
    itemsUrl.searchParams.set('token', APIFY_TOKEN)
    itemsUrl.searchParams.set('clean', 'true')
    itemsUrl.searchParams.set('limit', '1')
    itemsUrl.searchParams.set('format', 'json')

    const itemsRes = await fetch(itemsUrl.toString())
    if (!itemsRes.ok) {
      return { lastPostAt: null, error: `apify items status ${itemsRes.status}`, source: 'apify:instagram-scraper' }
    }
    const items: any[] = await itemsRes.json()
    const first = items && items[0]
    if (!first) {
      return { lastPostAt: null, error: 'no posts', source: 'apify:instagram-scraper' }
    }
    // Try common timestamp fields
    const ts = first.takenAt || first.timestamp || first.taken_at || first['taken_at_timestamp']
    const d = ts ? new Date(ts) : null
    if (!d || isNaN(d.getTime())) {
      return { lastPostAt: null, error: 'invalid post timestamp', source: 'apify:instagram-scraper' }
    }
    return { lastPostAt: d, error: null, source: 'apify:instagram-scraper' }
  } catch (e: any) {
    return { lastPostAt: null, error: e?.message || 'apify error', source: 'apify:instagram-scraper' }
  }
}

export async function getInstagramLastPost(username: string): Promise<InstagramResult> {
  // Basic normalization
  const u = username.replace(/^@/, '').trim()
  if (!u) return { lastPostAt: null, error: 'empty username', source: 'apify:instagram-scraper' }
  return apifyRunInstagramScraper(u)
}
