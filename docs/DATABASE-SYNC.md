# DynamoDB Sync Tool

Complete guide for syncing your local DynamoDB database to remote AWS DynamoDB.

> **Note**: After syncing data to remote, remember to revalidate static pages! See [STATIC-PAGES.md](./STATIC-PAGES.md).

## Quick Start

### 1. Prepare Local Database

```bash
pnpm db:local    # Start local DynamoDB
pnpm db:setup    # Create table
pnpm db:seed     # Add sample data
pnpm db:count    # Verify data loaded
```

### 2. Compare Schemas

```bash
pnpm sync:compare
```

Shows you the differences between all local and remote tables (users-dev, events-dev).

### 3. Sync All Data

```bash
pnpm sync:all
```

This syncs ALL tables to remote. Creates tables if they don't exist.

⚠️ **WARNING**: Always compare first to verify what will be synced!

## Commands

| Command | Description |
|---------|-------------|
| `pnpm sync:compare` | Compare all local and remote table schemas |
| `pnpm sync:all` | Sync all tables to remote (creates if needed) |
| `pnpm sync:recreate` | Delete and recreate all remote tables (DESTRUCTIVE) |

## Prerequisites

### Local DynamoDB

Your local database must be running and populated:

```bash
pnpm db:local    # Start Docker container
pnpm db:setup    # Create table schema
pnpm db:seed     # Load sample data
```

### AWS Credentials

Set up credentials in `.env.production` or use `aws configure`:

```bash
# .env.production
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
DYNAMODB_TABLE_NAME=rankings-dev
```

Or:
```bash
aws configure
```

## Common Workflows

### First-Time Setup

Remote tables don't exist yet:

```bash
# 1. Compare to see what will be created
pnpm sync:compare

# 2. Create remote tables and import data
pnpm sync:all
```

### Update Existing Tables

Data has changed, sync to remote:

```bash
pnpm sync:all
```

⚠️ This **adds** items to remote. To replace all data, use `sync:recreate`.

### Schema Changed

Local schema has changed (e.g., added GSI, changed keys):

```bash
# 1. Compare to see differences
pnpm sync:compare

# 2. Recreate remote tables
pnpm sync:recreate
```

## How It Works

### Compare (`sync:compare`)

- Scans both local and remote tables (users-dev, events-dev)
- Shows key schema, attributes, indexes, and item counts
- Highlights which tables exist and differences

### Sync All (`sync:all`)

- Scans all local tables (local-users, local-events)
- Creates remote tables if they don't exist
- Writes to remote tables in batches of 25 (AWS limit)
- **Adds** items to remote tables (doesn't delete existing)
- Shows progress for each table

### Recreate (`sync:recreate`)

1. Shows 5-second countdown (gives you time to cancel)
2. Deletes ALL remote tables completely
3. Creates new tables with local schemas
4. Imports all data from local tables
5. Preserves GSIs and billing mode (PAY_PER_REQUEST)

## Troubleshooting

### "Unable to locate credentials"

**Cause**: AWS credentials not configured

**Fix**:
```bash
aws configure
# Or set in .env.production
```

### "Connection refused" (local)

**Cause**: Local DynamoDB not running

**Fix**:
```bash
pnpm db:local
```

### "Table does not exist" (local)

**Cause**: Local table not created

**Fix**:
```bash
pnpm db:setup
pnpm db:seed
```

### "Table already exists" (remote)

**Cause**: Trying to create a table that exists

**Fix**:
```bash
# Use recreate to delete and rebuild
pnpm sync:recreate
```

### "Schema mismatch"

**Cause**: Local and remote schemas differ

**Fix**:
```bash
# Recreate remote table with local schema
pnpm sync:recreate
```

### "__dirname is not defined"

**Cause**: ES module compatibility issue

**Fix**: This is already fixed in the current version using `fileURLToPath`

## Environment Variables

**Local DynamoDB** (hardcoded):
- Endpoint: `http://localhost:8000`
- Table: `rankings`
- Region: `us-east-1` (dummy)

**Remote DynamoDB** (from environment):
- `AWS_REGION` - AWS region (default: `us-east-1`)
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `DYNAMODB_TABLE_NAME` - Remote table name (default: `rankings-dev`)

## Technical Details

- Remote table uses **PAY_PER_REQUEST** billing (on-demand)
- Batch writes limited to 25 items per request (AWS limit)
- Handles pagination automatically for large datasets
- Preserves Global Secondary Indexes (GSIs) during recreation
- Uses AWS SDK v3 with DynamoDB Document Client

## Build Time Database Access

✅ **Static pages now use ISR** (Incremental Static Regeneration)

Pages that require database access:
- `/rankings` - Pre-rendered at build, revalidates hourly
- `/events` - Pre-rendered at build, revalidates hourly
- `/test_LOCAL` - Dynamic (renders on each request)

After syncing data, manually refresh static pages:
```bash
pnpm revalidate:all
```

See [STATIC-PAGES.md](./STATIC-PAGES.md) for complete ISR documentation.

## Files

- `sport-hub/scripts/sync-dynamodb.ts` - Main sync tool
- `sport-hub/data-exports/` - Export directory (created automatically)
- `docs/DATABASE-SYNC.md` - This guide

## Next Steps

After syncing:

1. ✅ **Verify data**: Check AWS Console to confirm items were synced
2. 🚀 **Deploy**: Push to Amplify and test with remote database
3. 🔑 **Environment**: Ensure Amplify has all environment variables set
4. 🔄 **Revalidate**: Run `pnpm revalidate:all` to refresh static pages

Your local and remote databases now have the same schema and data! 🎉
