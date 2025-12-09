# Static Page Generation & Revalidation

## Overview

The `/rankings` and `/events` pages are now **statically generated with ISR (Incremental Static Regeneration)**. This means:

✅ **Fast initial page loads** - Pages are pre-rendered at build time
✅ **Automatic updates** - Pages automatically refresh every hour
✅ **On-demand updates** - You can manually trigger updates when data changes
✅ **Better SEO** - Search engines get fully rendered HTML

## How It Works

### ISR (Incremental Static Regeneration)

Both pages use `export const revalidate = 3600` which means:

1. **First Build**: Page is generated with data from DynamoDB
2. **User Visits**: Fast - serves the static HTML
3. **After 1 Hour**: Next request triggers background regeneration
4. **User Sees**: Still sees old page immediately (stale-while-revalidate)
5. **Background**: New version generates with fresh data
6. **Subsequent Requests**: Serve the new version

### Static Generation at Build Time

**Important**: For pages to be statically generated at build time, you need **data in DynamoDB** before running `pnpm build`.

#### Local Development Build

```bash
# 1. Start local DynamoDB
pnpm db:local

# 2. Setup and seed data
pnpm db:setup
pnpm db:seed

# 3. Build (will fetch data from local DynamoDB)
pnpm build

# Pages are now pre-rendered with data!
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

### Option 1: Automatic Revalidation (Wait 1 Hour)

Do nothing! Pages will automatically refresh within 1 hour of the next visit.

### Option 2: Manual Revalidation (Immediate)

Trigger an immediate update after changing data:

```bash
# Revalidate all static pages
pnpm revalidate:all

# Revalidate only rankings
pnpm revalidate:rankings

# Revalidate only events
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
├ ○ /events                        4.97 kB         158 kB   <- Static (ISR)
├ ƒ /dashboard                         0 B         136 kB   <- Dynamic

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

- `○` = Static (generated at build time)
- `ƒ` = Dynamic (rendered on each request)

Both `/rankings` and `/events` should show as `○` (Static).

## Troubleshooting

### Pages are marked as Dynamic (ƒ) instead of Static (○)

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
DYNAMODB_TABLE_NAME=rankings
```

### Production

```bash
# .env.production or Amplify environment variables
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
DYNAMODB_TABLE_NAME=rankings-dev
REVALIDATE_SECRET=your_secret_here
NEXT_PUBLIC_URL=https://your-app.com
```

## Files Modified

1. [/rankings/page.tsx](../sport-hub/src/app/rankings/page.tsx) - Changed from `force-dynamic` to `revalidate = 3600`
2. [/events/page.tsx](../sport-hub/src/app/events/page.tsx) - Changed from `force-dynamic` to `revalidate = 3600`
3. [/api/revalidate/route.ts](../sport-hub/src/app/api/revalidate/route.ts) - New on-demand revalidation endpoint
4. [scripts/revalidate-pages.sh](../sport-hub/scripts/revalidate-pages.sh) - New revalidation helper script

## Summary

### Benefits of Static + ISR

- ⚡ **Faster page loads** - Pre-rendered HTML served instantly
- 🔍 **Better SEO** - Search engines get complete HTML
- 💰 **Lower costs** - Less compute time (pages cached)
- 🔄 **Fresh data** - Auto-updates every hour + on-demand
- 📈 **Scalable** - Can handle high traffic

### When to Revalidate

| Scenario | Action | Method |
|----------|--------|--------|
| Added new athlete | Revalidate now | `pnpm revalidate:rankings` |
| Added new event | Revalidate now | `pnpm revalidate:events` |
| Updated scores | Revalidate now | `pnpm revalidate:all` |
| Minor changes | Wait 1 hour | Automatic |
| Urgent fix | Revalidate now | `pnpm revalidate:all` |

That's it! Your pages are now static, fast, and automatically stay up to date. 🚀
