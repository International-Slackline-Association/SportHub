# SportHub

A Next.js application for sports management and athlete profiles, built with React 19 and TypeScript.

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

## Documentation

📚 **Comprehensive Guides** in the [`/docs`](../docs) folder:

- **[Static Pages Guide](../docs/STATIC-PAGES.md)** - ISR, revalidation, and static page management
- **[Database Sync Guide](../docs/SYNC-DATABASE.md)** - Syncing local to remote DynamoDB
- **[Sync Tool Reference](../docs/SYNC-TOOL.md)** - Detailed sync tool documentation
- **[Claude Code Guide](../docs/CLAUDE.md)** - Working with Claude Code AI assistant

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
- 📊 **Rankings & Leaderboards** - Real-time athlete rankings
- 📅 **Event Management** - Competition and event tracking
- 🏆 **World Records** - Track and display world records
- 🤝 **Partner Management** - Sponsor and partner listings
- 📈 **Data Visualization** - Interactive charts and graphs
- ⚡ **Static + ISR Pages** - Fast loading with automatic updates
- 🔐 **Authentication** - AWS Cognito integration via NextAuth

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
- `pnpm db:count` - Show item counts
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
sport-hub/
├── src/
│   ├── app/           # Next.js App Router pages & API routes
│   ├── ui/            # Reusable UI components
│   ├── lib/           # Library code and utilities
│   ├── utils/         # Utility functions
│   ├── types/         # TypeScript type definitions
│   └── mocks/         # Mock data for development
├── scripts/           # Utility scripts (sync, revalidation)
├── docs/              # Documentation
│   ├── STATIC-PAGES.md
│   ├── SYNC-DATABASE.md
│   ├── SYNC-TOOL.md
│   └── CLAUDE.md
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