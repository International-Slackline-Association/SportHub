# SportHub - Project Information for Claude

## Project Overview
SportHub is a Next.js application for sports management and athlete profiles, built with React 19 and TypeScript. The application features static page generation with ISR (Incremental Static Regeneration), AWS Amplify hosting, and comprehensive database sync tools.

## Tech Stack
- **Framework**: Next.js 15.3.4 with App Router
- **Runtime**: React 19 with TypeScript 5
- **Styling**: Tailwind CSS 4.0
- **Package Manager**: pnpm
- **Database**: AWS DynamoDB (local & remote support)
- **Authentication**: NextAuth v5 with AWS Cognito
- **Hosting**: AWS Amplify
- **Build Tool**: Turbopack (experimental)

## Repository Structure

```
SportHub/                              # Repository root
├── README.md                          # Main project overview
├── docs/                              # 📚 All documentation
│   ├── README.md                     # Documentation index
│   ├── STATIC-PAGES.md               # ISR & revalidation guide
│   ├── DATABASE-SYNC.md              # Database sync tool guide
│   ├── CLAUDE.md                     # This file
│   ├── AMPLIFY_DEPLOYMENT.md         # Deployment guide
│   ├── AUTH_SETUP.md                 # Auth configuration
│   └── db-setup.md                   # Database setup
└── sport-hub/                         # Next.js application
    ├── README.md                      # Application documentation
    ├── src/                           # Application source
    │   ├── app/                      # Next.js App Router pages & API routes
    │   ├── ui/                       # Reusable UI components
    │   ├── lib/                      # Library code and utilities
    │   ├── utils/                    # Utility functions
    │   ├── types/                    # TypeScript definitions
    │   └── mocks/                    # Mock data
    │       └── data-exports/         # Seed JSON exports
    ├── scripts/                       # Utility scripts
    │   ├── sync-dynamodb.ts          # Database sync tool
    │   └── revalidate-pages.sh       # Revalidation helper
    ├── public/                        # Static assets
    └── package.json                   # Dependencies & scripts
```

## Key Dependencies
- `@aws-sdk/client-dynamodb` - AWS DynamoDB integration
- `@aws-sdk/lib-dynamodb` - DynamoDB Document Client
- `next-auth` - Authentication (v5 beta)
- `@tanstack/react-table` - Data table functionality
- `recharts` - Data visualization
- `class-variance-authority` - Component variants
- `clsx` & `tailwind-merge` - Utility classes

## Application Structure (sport-hub/src)

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── revalidate/    # On-demand revalidation
│   │   ├── rankings/      # Rankings API
│   │   ├── events/        # Events API
│   │   └── test-local/    # Local DB test endpoints
│   ├── athlete-profile/   # Athlete profile pages
│   ├── rankings/          # Rankings page (STATIC + ISR)
│   ├── events/            # Events page (STATIC + ISR)
│   ├── dashboard/         # User dashboard
│   ├── world_records/     # World records display
│   ├── judging/           # Judging interfaces
│   ├── partners/          # Partner management
│   ├── demo/              # Component demo page
│   ├── test_LOCAL/        # Local DB testing UI
│   ├── test_SSR/          # SSR testing
│   └── test_CSR/          # CSR testing
├── ui/                    # Reusable UI components
│   ├── Button/            # Button components
│   ├── Badge/             # Badge components
│   ├── Table/             # Data table components
│   ├── Navigation/        # Navigation components
│   ├── ProfileCard/       # Profile display components
│   ├── PageLayout/        # Standard page layout
│   ├── FeatureGrid/       # Feature grid layout
│   └── ...
├── lib/                   # Library code
│   ├── dynamodb.ts        # DynamoDB client setup
│   ├── data-services.ts   # Data access layer
│   ├── relational-types.ts # Type definitions
│   ├── db-setup.ts        # Database initialization
│   ├── seed-local-db.ts   # DatabaseSeeder class (fullSeedFromRankings, resetAndSeed, clearTable)
│   └── migrations/        # Migration & seed transformers
│       ├── seed-from-rankings-data.ts          # Seed transformer (reads rankings-seed-data.json)
│       └── migrate-isa-rankings-to-sporthub.ts # Live ISA-Rankings → SportHub migration
├── utils/                 # Utility functions
├── types/                 # TypeScript type definitions
└── mocks/                 # Mock data
    └── data-exports/
        └── rankings-seed-data.json    # Committed seed file (200 athletes, anonymised)
```

## Path Aliases
- `@ui/*` → `src/ui/*`
- `@utils/*` → `src/utils/*`
- `@types/*` → `src/types/*`
- `@mocks/*` → `src/mocks/*`
- `@lib/*` → `src/lib/*`

## Available Commands

All commands are prefixed for organization. Run from `sport-hub/` directory.

### Development
```bash
pnpm dev                    # Start dev server with Turbopack
pnpm build                  # Build production app with Turbopack
pnpm start                  # Start production server
pnpm lint                   # Run ESLint
pnpm test:local             # Dev server with local DynamoDB
```

### Database Management
```bash
pnpm db:local               # Start local DynamoDB container
pnpm db:setup               # Create required tables
pnpm db:seed                # Seed from rankings JSON (200 athletes, 10 events, 40 contests)
pnpm db:reset               # Clear and reseed data
pnpm db:clear               # Clear all data only
pnpm db:count               # Show item counts
pnpm db:stop                # Stop DynamoDB container
pnpm db:clean               # Remove container and volumes
```

### Sync to Production
```bash
pnpm sync:compare           # Compare local vs remote schemas
pnpm sync:export            # Export local data to files
pnpm sync:import            # Import local data to remote
pnpm sync:recreate          # Delete & recreate remote table (DESTRUCTIVE)
```

### Static Page Revalidation
```bash
pnpm revalidate:all         # Revalidate all static pages
pnpm revalidate:rankings    # Revalidate /rankings page
pnpm revalidate:events      # Revalidate /events page
```

## Static Pages with ISR

**Important**: `/rankings` and `/events` are statically generated with ISR.

### How It Works
- **Build Time**: Pages are pre-rendered with data from DynamoDB
- **Revalidate**: Automatically refresh every 1 hour (`revalidate = 3600`)
- **On-Demand**: Manually refresh using `pnpm revalidate:*` commands

### When to Revalidate
- After adding/updating athletes → `pnpm revalidate:rankings`
- After adding/updating events → `pnpm revalidate:events`
- After any data changes → `pnpm revalidate:all`

### Build Requirements
For static pages to build with data:
1. DynamoDB must be accessible (local or remote)
2. Data must exist in the database
3. Environment variables must be set

**See**: [../docs/STATIC-PAGES.md](./STATIC-PAGES.md) for complete guide

## Database Sync Workflow

### Local to Production Sync
```bash
# 1. Setup local data
pnpm db:local
pnpm db:setup
pnpm db:seed

# 2. Sync to remote
pnpm sync:import

# 3. Revalidate static pages
pnpm revalidate:all
```

**See**: [../docs/DATABASE-SYNC.md](./DATABASE-SYNC.md) for complete guide

## Environment Configuration

### Local Development (`.env.local`)
```env
# Local DynamoDB
DYNAMODB_LOCAL=true
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here
```

### Production (`.env.production` or Amplify env vars)
```env
# AWS DynamoDB (destination region)
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your_actual_key
AWS_SECRET_ACCESS_KEY=your_actual_secret
AWS_SESSION_TOKEN=your_session_token  # If using temporary credentials
ISA_RANKINGS_REGION=eu-central-1      # Source tables region

# NextAuth
NEXTAUTH_URL=https://your-app.com
NEXTAUTH_SECRET=your_production_secret

# AWS Cognito
COGNITO_CLIENT_ID=your_client_id
COGNITO_CLIENT_SECRET=your_client_secret
COGNITO_ISSUER=https://cognito-idp.eu-central-1.amazonaws.com/your_pool_id

# Revalidation
REVALIDATE_SECRET=your_revalidation_secret
NEXT_PUBLIC_URL=https://your-app.com
```

## Database Schema

### UserRecord (Main table: sporthub-users / sporthub-users-dev)
```typescript
{
  userId: string;              // Primary key
  type: 'athlete' | 'official' | 'admin';
  name: string;
  email: string;
  country?: string;
  createdAt: string;
  totalPoints: number;
  contestsParticipated: number;
  firstCompetition?: string;
  lastCompetition?: string;
  eventParticipations: EventParticipation[];
}
```

### EventRecord
```typescript
{
  eventId: string;             // Primary key
  name: string;
  discipline: string;
  date: string;
  country: string;
  participants?: EventParticipant[];
}
```

### EventParticipation
```typescript
{
  eventId: string;
  eventName: string;
  place: string;
  points: number;
  category: number;
  discipline: string;
  date: string;
}
```

## Testing & Development

### Test Pages
- `/test_LOCAL` - Comprehensive local DynamoDB testing interface
  - Database setup wizard
  - Data seeding controls
  - Statistics dashboard
  - Sample data viewer
- `/test_SSR` - Server-side rendering tests
- `/test_CSR` - Client-side rendering tests

### Seed Data

Local seeding uses `src/mocks/data-exports/rankings-seed-data.json` — a reduced, anonymised subset of the ISA-Rankings export (no real emails, URLs, or personal data). It is committed to the repo.

The transformer `src/lib/migrations/seed-from-rankings-data.ts` reads this JSON and synthesises:
- **200 athlete profiles** (generated `SportHubID:xxxx`, no `isaUsersId`)
- **1,600 ranking records** (Trickline + Highline, years 2024 and all-time)
- **10 synthetic events** across 10 countries (2024–2025)
- **40 contests** (Trickline/Highline × Men/Women per event)
- **2,020 participation records**

The **ISA-Rankings Migration** flow (`migrate-isa-rankings-to-sporthub.ts`) is a separate path used only when migrating directly from the live AWS ISA-Rankings table — it requires AWS credentials and is not part of the local dev seed workflow.

### Local DynamoDB Workflow
```bash
# 1. Start local database
pnpm db:local

# 2. Visit setup interface
open http://localhost:3000/test_LOCAL

# 3. Or use CLI commands
pnpm db:setup
pnpm db:seed   # Seeds from rankings-seed-data.json
pnpm db:count

# 4. Develop with local data
pnpm dev
```

## Layout Standards

### Page Layout Consistency
All pages MUST use consistent width and spacing patterns.

**Required Pattern:**
```tsx
import PageLayout from '@ui/PageLayout';

export default function YourPage() {
  return (
    <PageLayout
      title="Your Page Title"
      description="Optional description"
      heroImage={{ // Optional
        src: "/static/images/hero-image.jpg",
        alt: "Alt text",
        caption: "Optional caption"
      }}
    >
      <section className="p-4 sm:p-0">
        {/* Your main content sections */}
      </section>
    </PageLayout>
  );
}
```

**Key Layout Rules:**
- Every page MUST use `PageLayout` component
- All content sections MUST use `className="p-4 sm:p-0"`
- Mobile: 1rem padding, Desktop: relies on layout's 2.5rem padding
- Tables auto-constrain with `table-layout: fixed`

**DO NOT:**
- Create pages with inconsistent padding
- Use different container structures
- Allow tables to expand beyond standard width

## Key Features

- 🏃 **Athlete Profile Management** - Comprehensive profiles with stats
- 📊 **Rankings & Leaderboards** - Real-time athlete rankings (ISR)
- 📅 **Event Management** - Competition tracking (ISR)
- 🏆 **World Records** - World record displays
- 🤝 **Partner Management** - Sponsor listings
- 📈 **Data Visualization** - Charts with Recharts
- ⚡ **Static + ISR Pages** - Fast loads with auto-updates
- 🔐 **Authentication** - AWS Cognito via NextAuth
- 🔄 **Database Sync** - Local to production sync tool
- 🔄 **On-Demand Revalidation** - Manual page refresh API

## Common Workflows

### Local Development
```bash
pnpm db:local
pnpm db:setup
pnpm db:seed
pnpm dev
```

### Update Production Data
```bash
# Update local
pnpm db:seed

# Sync to remote
pnpm sync:import

# Refresh pages
pnpm revalidate:all
```

### Initial Production Setup
```bash
# Setup local
pnpm db:local
pnpm db:setup
pnpm db:seed

# Sync to production
pnpm sync:recreate

# Deploy
git push
```

## Build & Deploy

### Local Build
```bash
# Requires local DynamoDB running with data
pnpm db:local
pnpm db:seed
pnpm build
```

### Production Build (AWS Amplify)
- Builds on `git push` to main branch
- Fetches data from remote DynamoDB
- Pre-renders `/rankings` and `/events` with ISR
- Environment variables configured in Amplify console

### Build Output Indicators
```
○  (Static)   - Pre-rendered at build time
ƒ  (Dynamic)  - Rendered on each request
```

Both `/rankings` and `/events` should show as `○` (Static).

## Documentation

Comprehensive guides in `/docs` folder:
- **[README.md](./README.md)** - Documentation index & quick reference
- **[STATIC-PAGES.md](./STATIC-PAGES.md)** - ISR, revalidation, troubleshooting
- **[DATABASE-SYNC.md](./DATABASE-SYNC.md)** - Database sync tool guide (local ↔ remote)
- **[AMPLIFY_DEPLOYMENT.md](./AMPLIFY_DEPLOYMENT.md)** - Deployment guide
- **[AUTH_SETUP.md](./AUTH_SETUP.md)** - Authentication configuration
- **[db-setup.md](./db-setup.md)** - Database setup

## Important Notes

### Schema Migration
- Old schema used `athleteId` and `contestId`
- New schema uses `userId` and `eventId`
- All code updated to new schema (Nov 2024)
- Relational demo page removed

### Static Pages
- `/rankings` and `/events` are static + ISR
- Auto-revalidate every 1 hour
- Manual revalidation after data updates
- No database access during build in dev (prevents errors)

### Database
- Local: DynamoDB Local via Docker (port 8000)
- Remote: AWS DynamoDB (`sporthub-users-dev`, `sporthub-events-dev` tables in us-east-2)
- Schema: Single table design with userId as primary key
- Data persists in `sport-hub/dynamodb-data/`

### Authentication
- Uses NextAuth v5 (beta)
- AWS Cognito as provider
- Protected routes via middleware
- Session management

### Turbopack
- Experimental build tool
- Faster builds than webpack
- May have different bundle sizes
- No disk caching yet

### ES Modules
- Project uses `"type": "module"` in package.json
- Use `import/export` syntax
- For scripts: Use `import { fileURLToPath } from 'node:url'` for `__dirname`

## Performance Optimizations

- Static page generation for `/rankings` and `/events`
- Incremental Static Regeneration (1 hour)
- Image optimization with Next.js Image
- Font optimization with Open Sans
- Component code splitting
- API route caching strategies

## Development Tips

1. **Always start with local database** for development
2. **Use the test interface** at `/test_LOCAL` for quick setup
3. **Revalidate pages** after data changes in production
4. **Check build output** to verify static page generation
5. **Use sync tools** to keep local and remote in sync
6. **Follow layout standards** for consistency
7. **Prefix commands** properly (`db:`, `sync:`, `revalidate:`)

---

**Last Updated**: November 2024
**Version**: 2.0
