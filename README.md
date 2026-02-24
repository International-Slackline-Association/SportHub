![](/sport-hub/public/favicon.ico)

[![](https://dcbadge.limes.pink/api/server/ugeS27zcuD)](https://discord.gg/ugeS27zcuD)

# ISA SportHub

Welcome to the ISA SportHub repo! A Next.js application for sports management and athlete profiles.

## Tech Stack

- **Framework**: Next.js 15.3 with App Router
- **Runtime**: React 19 with TypeScript 5
- **Styling**: Tailwind CSS 4.0
- **Package Manager**: pnpm
- **Database**: AWS DynamoDB (local development support)
- **Authentication**: NextAuth v5
- **Build Tool**: Turbopack
- **Hosting**: AWS Amplify

## Quick Start

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start development server**:
   ```bash
   pnpm dev
   ```

3. **Open the application**: [http://localhost:3000](http://localhost:3000)

## Database Architecture

SportHub uses a **hierarchical sort key pattern** with DynamoDB for efficient querying and minimal data duplication.

### Users Table
**Primary Key**: `userId` (partition) + `sortKey` (sort)
**GSI**: userSubType-index, discipline-rankings-index

**Record Types** (distinguished by sortKey):
- `Profile` - User profile with aggregated stats (role, points, contestCount)
- `Ranking:{type}:{year}:{discipline}:{gender}:{ageCategory}` - Individual rankings
- `Participation:{contestId}` - Contest participation records

### Events Table
**Primary Key**: `eventId` (partition) + `sortKey` (sort)
**GSI**: contestId-index, date-discipline-index

**Record Types**:
- `Metadata` - Event-level information (name, location, dates)
- `Contest:{discipline}:{contestId}` - Contest with embedded participants

### Reference Database (isa-users)
**Purpose**: Centralized user identity storage (name, email, phone, country)
**Region**: eu-central-1
**Access**: Via `reference-db-service.ts`

**Benefits**:
- Single source of truth for user identity
- Reduces data duplication across tables
- Enables cross-region user management
- Separates identity from application data

### Query Performance
All queries use composite keys or GSI lookups - **NO TABLE SCANS**:
- Direct key lookup (GetItem): ~10ms
- GSI query with limit 100: ~50ms
- Hierarchical query with pagination: ~20-30ms
- BatchGetItem (100 items): ~80ms vs. ~800ms sequential

## Documentation

📚 **Comprehensive Guides** in the [`docs/`](docs/) folder:

### Database & Architecture
- **[Database Schema](docs/schema/database-schema.md)** - Complete table definitions and examples
- **[Query Patterns](docs/schema/query-patterns.md)** - Query examples and best practices
- **[Reference DB Pattern](docs/architecture/reference-db-pattern.md)** - Identity separation architecture
- **[Authentication Flow](docs/architecture/authentication-flow.md)** - Cognito + NextAuth integration
- **[RBAC System](docs/RBAC.md)** - Role-based access control

### Development Guides
- **[Static Pages Guide](docs/STATIC-PAGES.md)** - ISR, revalidation, and static page management
- **[Database Sync Guide](docs/DATABASE-SYNC.md)** - Syncing local to remote DynamoDB
- **[Authentication Setup](docs/AUTH_SETUP.md)** - Setting up Cognito authentication
- **[Claude Code Guide](docs/CLAUDE.md)** - Working with Claude Code AI assistant

### API Reference
- **[Data Services](docs/api/data-services.md)** - Data service layer API
- **[User Query Service](docs/api/user-query-service.md)** - User query functions
- **[Reference DB Service](docs/api/reference-db-service.md)** - Reference DB operations

### App-Specific
- **[Developer Reference](sport-hub/CLAUDE.md)** - SportHub app developer guide

## Local Database Development

### Quick Database Setup

```bash
# Start local DynamoDB
pnpm db:local

# Setup and seed data
pnpm db:setup
pnpm db:seed

# Visit the setup interface
http://localhost:3000/test_LOCAL
```

## Key Features

- 🏃 **Athlete Profile Management** - Comprehensive athlete profiles with stats
- 📊 **Rankings & Leaderboards** - Multi-dimensional rankings (discipline, gender, age)
- 📅 **Event Management** - Competition and event tracking
- 🏆 **World Records** - Track and display world records
- 🤝 **Partner Management** - Sponsor and partner listings
- 📈 **Data Visualization** - Interactive charts and graphs
- ⚡ **Static + ISR Pages** - Fast loading with automatic updates
- 🔐 **Authentication** - AWS Cognito integration via NextAuth
- 🎯 **RBAC System** - Role-based access control (admin, athlete, judge, organizer)
- 🚀 **Optimized Queries** - Hierarchical schema eliminates table scans (~10-50ms queries)
- 💾 **Reference DB Pattern** - Separation of user identity from application data

## Available Scripts

### Development
- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build production application
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm test:local` - Dev server with local DynamoDB

### Database Management
- `pnpm db:local` - Start local DynamoDB container
- `pnpm db:setup` - Create required tables
- `pnpm db:seed` - Seed with mock data
- `pnpm db:reset` - Clear and reseed data
- `pnpm db:clear` - Clear all data
- `pnpm db:count` - Show record counts in all tables
- `pnpm db:gui` - Launch DynamoDB Admin GUI on port 8001
- `pnpm db:stop` - Stop DynamoDB container
- `pnpm db:clean` - Remove DynamoDB container and data

### Sync to Production
- `pnpm sync:compare` - Compare local vs remote schemas
- `pnpm sync:export` - Export local data to files
- `pnpm sync:import` - Import local data to remote
- `pnpm sync:recreate` - Recreate remote table with local data

### Static Page Revalidation
- `pnpm revalidate:all` - Revalidate all static pages
- `pnpm revalidate:rankings` - Revalidate rankings page
- `pnpm revalidate:events` - Revalidate events page

## Project Structure

```
docs/              # Documentation
├── STATIC-PAGES.md
├── SYNC-DATABASE.md
├── SYNC-TOOL.md
├── CLAUDE.md
└── etc...
sport-hub/
├── src/
│   ├── app/           # Next.js App Router pages & API routes
│   ├── ui/            # Reusable UI components
│   ├── lib/           # Library code and utilities
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript type definitions
│   └── mocks/         # Mock data for development
├── scripts/           # Utility scripts (sync, revalidation)
└── public/            # Static assets
```

## Path Aliases

- `@ui/*` → `src/ui/*`
- `@utils/*` → `src/utils/*`
- `@types/*` → `src/types/*`
- `@mocks/*` → `src/mocks/*`
- `@lib/*` → `src/lib/*`

## Common Workflows

### Local Development
```bash
# 1. Start local database
pnpm db:local

# 2. Setup and seed
pnpm db:setup
pnpm db:seed

# 3. Start dev server
pnpm dev
```

### Update Data & Deploy
```bash
# 1. Update local data
pnpm db:seed

# 2. Sync to production
pnpm sync:import

# 3. Revalidate static pages
pnpm revalidate:all
```

### Initial Production Setup
```bash
# 1. Setup local data
pnpm db:local
pnpm db:setup
pnpm db:seed

# 2. Sync to remote DynamoDB
pnpm sync:recreate

# 3. Deploy
git push
```

## Learn More

- **[Static Pages Guide](../docs/STATIC-PAGES.md)** - ISR and revalidation
- **[Database Sync Guide](../docs/SYNC-DATABASE.md)** - Syncing to production
- [Next.js Documentation](https://nextjs.org/docs) - Next.js features and API
- [AWS Amplify Docs](https://docs.amplify.aws/) - Deployment platform