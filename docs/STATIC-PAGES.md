# Static Page Generation & Revalidation

## Overview

The `/rankings` page is **statically generated with ISR (Incremental Static Regeneration)**. The `/events` page is **dynamically rendered on each request**, backed by a 10-minute in-memory cache so DynamoDB is not hit on every visit.

✅ **Fast initial page loads** - `/rankings` is pre-rendered at build time
✅ **Automatic updates** - `/rankings` automatically refreshes every hour; `/events` refreshes from cache every 10 minutes
✅ **On-demand updates** - Server actions automatically invalidate the cache when scores or status change
✅ **Better SEO** - Both pages return fully rendered HTML

## How It Works

### `/rankings` — ISR (Incremental Static Regeneration)

`/rankings` uses `export const revalidate = 3600` which means:

1. **First Build**: Page is generated with data from DynamoDB
2. **User Visits**: Fast — serves the static HTML
3. **After 1 Hour**: Next request triggers background regeneration
4. **User Sees**: Still sees old page immediately (stale-while-revalidate)
5. **Background**: New version generates with fresh data
6. **Subsequent Requests**: Serve the new version

### `/events` — Dynamic with In-Memory Cache

`/events` uses `export const dynamic = 'force-dynamic'`, which means:

1. **Every Request**: Page is server-rendered on demand
2. **In-Memory Cache**: `getContestsData()` caches results for 10 minutes — DynamoDB is only queried after the cache expires or is invalidated
3. **Cache Invalidation**: Server actions (`updateEventScores`, `updateEventStatus`) call `invalidateContestsCache()` automatically — the table reflects saved results immediately without a hard refresh
4. **No Build-Time Data Required**: `/events` does not need DynamoDB at build time

### Static Generation at Build Time

**Important**: For pages to be statically generated at build time, you need **data in DynamoDB** before running `pnpm build`.

#### Local Development Build

```bash
# 1. Start local DynamoDB
pnpm db:local

# 2. Setup and seed data
pnpm db:setup
pnpm db:seed

# 3. Build (will fetch data from local DynamoDB for /rankings)
pnpm build

# /rankings is now pre-rendered with data; /events renders dynamically
```

#### Production Build (AWS Amplify)

For production builds on AWS Amplify:

1. **Data must exist** in your remote DynamoDB table before build
2. **Sync your local data** to remote before deploying:
   ```bash
   pnpm sync:recreate
   ```
3. **Deploy** - Amplify build will fetch from remote DynamoDB
4. Pages will be pre-rendered with live data

If there's no data at build time, pages will still build but show empty state.

## Updating Data

When you add or update data in DynamoDB, you have two options to refresh the pages:

### Option 1: Automatic Revalidation (Wait)

Do nothing!
- `/rankings` automatically refreshes within 1 hour of the next visit.
- `/events` automatically reflects changes within 10 minutes (in-memory cache TTL), or immediately when scores/status are saved via the admin UI (cache is invalidated by server actions).

### Option 2: Manual Revalidation (Immediate)

Trigger an immediate update after changing data:

```bash
# Revalidate all static pages
pnpm revalidate:all

# Revalidate only rankings
pnpm revalidate:rankings

# Note: pnpm revalidate:events is no longer needed for score updates —
# saving scores via the admin UI automatically invalidates the events cache.
pnpm revalidate:events
```

### How Manual Revalidation Works

The revalidation commands call the `/api/revalidate` endpoint which uses Next.js's `revalidatePath()` API to clear the cache and regenerate the page.

**For Production**: Set `REVALIDATE_SECRET` environment variable to secure the endpoint:

```bash
# In .env.production or Amplify environment variables
REVALIDATE_SECRET=your_secret_here_change_this
```

Then call the API with the secret:

```bash
curl -X POST https://your-app.com/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"path": "/rankings", "secret": "your_secret_here_change_this"}'
```

Or revalidate multiple paths:

```bash
curl -X POST https://your-app.com/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"paths": ["/rankings", "/events"], "secret": "your_secret_here_change_this"}'
```

## Common Workflows

### Workflow 1: Initial Setup & Deploy

```bash
# 1. Setup local data
pnpm db:local
pnpm db:setup
pnpm db:seed

# 2. Test local build
pnpm build
pnpm start

# 3. Sync to remote DynamoDB
pnpm sync:recreate

# 4. Deploy to Amplify
git push

# Pages will be pre-rendered with your data!
```

### Workflow 2: Update Data & Refresh Pages

```bash
# 1. Update data locally
pnpm db:seed  # or manually add data

# 2. Sync to remote
pnpm sync:import

# 3. Revalidate pages (production)
pnpm revalidate:all

# OR wait up to 1 hour for automatic refresh
```

### Workflow 3: Development (Dynamic Rendering)

For local development, you probably want real-time updates instead of static pages:

```bash
# Start dev server with local DynamoDB
pnpm test:local

# OR regular dev
pnpm dev
```

In development mode, pages render on each request (ISR is disabled in dev).

## Build Output

When you run `pnpm build`, you'll see the rendering mode for each page:

```
Route (app)                           Size  First Load JS
├ ○ /                                  0 B         136 kB   <- Static
├ ○ /rankings                      4.84 kB         158 kB   <- Static (ISR)
├ ƒ /events                        4.97 kB         158 kB   <- Dynamic
├ ƒ /dashboard                         0 B         136 kB   <- Dynamic

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

- `○` = Static (generated at build time)
- `ƒ` = Dynamic (rendered on each request)

`/rankings` should show as `○` (Static). `/events` shows as `ƒ` (Dynamic) — this is expected.

## Troubleshooting

### `/rankings` is marked as Dynamic (ƒ) instead of Static (○)

**Cause**: Build couldn't connect to DynamoDB or no data exists.

**Solution**:
1. Make sure DynamoDB is running: `pnpm db:local`
2. Make sure data exists: `pnpm db:count`
3. Rebuild: `pnpm build`

### Empty pages after build

**Cause**: No data in DynamoDB at build time.

**Solution**:
```bash
pnpm db:seed
pnpm build
```

### Revalidation not working

**Cause**: App not running or wrong URL.

**Solution**:
```bash
# Make sure app is running
pnpm start

# Check URL in scripts/revalidate-pages.sh
# For production, set NEXT_PUBLIC_URL environment variable
export NEXT_PUBLIC_URL=https://your-app.com
pnpm revalidate:all
```

### Changes not showing after revalidation

**Cause**: Browser cache or revalidation failed.

**Solution**:
1. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
2. Check revalidation response for errors
3. Wait a few seconds and refresh again

## Environment Variables

### Development

```bash
# .env.local
DYNAMODB_LOCAL=true
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_REGION=us-east-2
```

### Production

```bash
# .env.production or Amplify environment variables
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
REVALIDATE_SECRET=your_secret_here
NEXT_PUBLIC_URL=https://your-app.com
```

## Files Modified

1. [/rankings/page.tsx](../sport-hub/src/app/rankings/page.tsx) - Uses `revalidate = 3600` (ISR)
2. [/events/page.tsx](../sport-hub/src/app/events/page.tsx) - Uses `force-dynamic`; cache handled by `SimpleCache` in data-services
3. [/api/revalidate/route.ts](../sport-hub/src/app/api/revalidate/route.ts) - On-demand revalidation endpoint (for `/rankings`)
4. [scripts/revalidate-pages.sh](../sport-hub/scripts/revalidate-pages.sh) - Revalidation helper script

## Summary

### Benefits of Static + ISR (`/rankings`) and Dynamic + Cache (`/events`)

- ⚡ **Faster page loads** - `/rankings` pre-rendered HTML served instantly; `/events` cached in-memory (no DB on cache hit)
- 🔍 **Better SEO** - Both pages return fully rendered HTML
- 💰 **Lower costs** - Less compute time (pages cached)
- 🔄 **Fresh data** - `/rankings` auto-updates every hour; `/events` reflects score saves immediately via cache invalidation
- 📈 **Scalable** - Can handle high traffic

### When to Revalidate

| Scenario | Action | Method |
|----------|--------|--------|
| Added new athlete | Revalidate now | `pnpm revalidate:rankings` |
| Added new event | Cache auto-expires | Automatic (≤10 min) |
| Updated scores via admin UI | Automatic | Cache invalidated by server action |
| Updated scores manually in DB | Cache auto-expires | Automatic (≤10 min) |
| Minor changes | Wait | Automatic |
| Urgent `/rankings` fix | Revalidate now | `pnpm revalidate:rankings` |

That's it! Your pages are now static, fast, and automatically stay up to date. 🚀
