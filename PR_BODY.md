# Ratings Snapshot App: Neon DB, Prisma generate on Vercel, MillionVerifier, Results/Exports

## Summary
This PR adds a full MVP of the Product Ratings Snapshot tool.
It includes CSV upload, orchestrated pipeline to discover products, extract ratings, parse policies, enrich Instagram, discover/verify emails, brand aggregation, and results with CSV exports.

## Key Changes
- App
  - `src/app/page.tsx`: Simple dashboard (Upload, Run, Results)
  - `src/app/upload/page.tsx`: CSV upload with post-submit CTAs
  - `src/app/run/page.tsx`: Batch action buttons; resilient brands fetch
  - `src/app/results/page.tsx`: Filters and CSV export buttons
- APIs
  - `src/app/api/brands/route.ts`: Includes aggregates, policy snapshot, counts
  - `src/app/api/products/route.ts`: List products (optional brand filter)
  - `src/app/api/export/brands/route.ts`, `src/app/api/export/products/route.ts`: CSV exports
  - `src/app/api/discover-products/route.ts`, `src/app/api/extract-ratings/route.ts`, `src/app/api/aggregate-brands/route.ts`
  - `src/app/api/policies/route.ts`, `src/app/api/enrich-instagram/route.ts`, `src/app/api/enrich-emails/route.ts`
- Lib
  - Ratings parsing (JSON-LD + widget fallbacks), brand aggregation
  - Policies crawl/parse; robots cache; on-site email discovery
  - Instagram enrichment via Apify; email verification via MillionVerifier
- Prisma
  - `prisma/schema.prisma`: switched datasource to `postgresql` for Neon
  - Generated client outputs to `src/generated/prisma`
- Build/Deploy
  - `package.json`: `postinstall` and `build` run `prisma generate` (fixes Vercel cache issue)

## Environment Variables (Vercel → Project → Settings → Environment Variables)
- `DATABASE_URL` = Neon pooled URL, e.g.
  - `postgresql://<user>:<pass>@<neon-host>-pooler.<region>.neon.tech/neondb?sslmode=require&pgbouncer=true`
- `APIFY_TOKEN` = Apify API token
- `IG_LOOKBACK_DAYS` = `30`
- `MILLIONVERIFIER_ENABLED` = `true`
- `MILLIONVERIFIER_API_KEY` = MillionVerifier API token

## Vercel Project
- Root Directory: `ratings-snapshot`
- Framework: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`

## Usage Flow
1. `/upload` → upload brands CSV (merchant_name, optional domain, instagram_username, return/shipping policy URLs, google_brand_query)
2. `/run` → execute in order:
   - Resolve domains (20)
   - Discover products (10 brands)
   - Extract ratings (50 products)
   - Parse policies (15)
   - Enrich Instagram (20)
   - Discover emails (15)
   - Aggregate brands (25)
3. `/results` → filter and export CSVs

## Notes
- Robots.txt respected; concurrency and caching handled in libs.
- MillionVerifier runs only for personal emails after syntax+MX and respects 90-day TTL.
- Instagram active flag computed by last post within IG_LOOKBACK_DAYS.

## Checklist
- [ ] Vercel env vars set (including Neon `DATABASE_URL`)
- [ ] Neon schema initialized (`npx prisma db push` run locally against Neon)
- [ ] Deployed Preview on Vercel
- [ ] Smoke test `/upload`, `/run`, `/results`
