# DynamoDB Local Setup Guide

Quick guide to get your local DynamoDB instance running with seed data.

## Prerequisites

- Docker installed and running
- Node.js and pnpm installed
- [Environment Files](#environment-files) configuration

## Quick Start

### 1. Start DynamoDB Local

```bash
pnpm db:local
```

This starts a DynamoDB container on `localhost:8000` with persistent storage.

### 2. Verify DynamoDB is Running

```bash
# Should return empty list initially
AWS_ACCESS_KEY_ID=dummy AWS_SECRET_ACCESS_KEY=dummy aws dynamodb list-tables --endpoint-url http://localhost:8000 --region us-east-2
```

### 3. Create Tables & Seed Data (Web UI)

1. **Open the test interface**: http://localhost:3000/test_LOCAL
2. **Click "Setup Tables"** - Creates required database tables
3. **Click "Seed Data"** - Seeds from `src/mocks/data-exports/rankings-seed-data.json`
    - 200 athletes, 10 events, 40 contests, ~1,600 ranking records
    - Takes about 30–60 seconds
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
DYNAMODB_LOCAL=true DYNAMODB_ENDPOINT=http://localhost:8000 AWS_REGION=us-east-2 npx tsx src/lib/db-setup.ts

# 3. Seed data (requires manual script execution)
DYNAMODB_LOCAL=true DYNAMODB_ENDPOINT=http://localhost:8000 AWS_REGION=us-east-2 npx tsx src/lib/seed-local-db.ts seed
```

## Test Pages

Once seeded, visit these pages to test functionality:

- **`/test_LOCAL`** - Main database testing interface
- **`/relational-demo`** - Demonstrates relational data structure
- **`/test_SSR`** - Server-side rendering tests
- **`/test_CSR`** - Client-side rendering tests

## Seed Data Source

Seed data comes from `src/mocks/data-exports/rankings-seed-data.json` — a reduced, anonymised export of the ISA-Rankings table (no real emails, profile URLs, or personal data). It is committed to the repo and requires no external dependencies.

The `ISA-Rankings Migration` section on `/test_LOCAL` is a separate path used only when migrating directly from the live ISA-Rankings DynamoDB table (requires AWS credentials and access). For local development, always use **Seed Data**.

## Data Overview

After seeding you'll have:

- **200 unique athletes** (user profiles, no ISA user IDs)
- **1,600 ranking records** (Trickline + Highline, years 2024 and all-time)
- **2,020 participation records** (athletes distributed across contests)
- **10 events** across FR, DE, US, BR, CH, JP, AU, ES, CA, IT (2024–2025)
- **40 contests** (Trickline/Highline × Men/Women per event)
- **Hierarchical sort-key schema** enabling efficient lookups without table scans

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
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
NODE_ENV=development
```