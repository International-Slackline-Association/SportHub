# DynamoDB Local Setup Guide

Quick guide to get your local DynamoDB instance running with seed data.

## Prerequisites

- Docker installed and running
- Node.js and pnpm installed

## Quick Start

### 1. Start DynamoDB Local

```bash
pnpm db:local
```

This starts a DynamoDB container on `localhost:8000` with persistent storage.

### 2. Verify DynamoDB is Running

```bash
# Should return empty list initially
AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy aws dynamodb list-tables --endpoint-url http://localhost:8000 --region us-east-1
```

### 3. Create Tables & Seed Data (Web UI)

1. **Open the test interface**: http://localhost:3000/test_LOCAL
2. **Click "Setup Tables"** - Creates required database tables
3. **Click "Seed Data"** - Loads ~1,686 athletes and ~5,186 contest entries
    - This can take a minute...
4. **Verify data loaded** - Check the data counts update on the page

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm db:local` | Start DynamoDB container |
| `pnpm db:stop` | Stop DynamoDB container |
| `pnpm db:clean` | Remove container and all data |
| `pnpm test:local` | Start dev server with local DB config |

## Manual Command Line Setup

If you prefer CLI over web interface:

```bash
# 1. Start DynamoDB
pnpm db:local

# 2. Create tables (requires manual script execution)
DYNAMODB_LOCAL=true DYNAMODB_ENDPOINT=http://localhost:8000 AWS_REGION=us-east-1 npx tsx src/lib/db-setup.ts

# 3. Seed data (requires manual script execution)
DYNAMODB_LOCAL=true DYNAMODB_ENDPOINT=http://localhost:8000 AWS_REGION=us-east-1 npx tsx src/lib/seed-local-db.ts seed
```

## Test Pages

Once seeded, visit these pages to test functionality:

- **`/test_LOCAL`** - Main database testing interface
- **`/relational-demo`** - Demonstrates relational data structure
- **`/test_SSR`** - Server-side rendering tests
- **`/test_CSR`** - Client-side rendering tests

## Data Overview

After seeding you'll have:

- **1,686 unique athletes** (user profiles)
- **5,186 athlete entries** (individual contest performances)
- **~400 contests** across multiple disciplines
- **Relational structure** enabling efficient lookups

## Troubleshooting

**Container won't start?**
```bash
pnpm db:clean  # Remove old container
pnpm db:local  # Start fresh
```

**Tables not creating?**
- Check DynamoDB is responding: `curl http://localhost:8000`
- Use web interface instead of CLI commands
- Check console logs for errors

**No data showing?**
- Refresh the `/test_LOCAL` page
- Check data counts in the interface
- Use "Refresh Stats" button

## Environment Files

The system uses `.env.local` for local development:

```env
DYNAMODB_LOCAL=true
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
NODE_ENV=development
```