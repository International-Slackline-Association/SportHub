# SportHub

A Next.js application for sports management and athlete profiles, built with React 19 and TypeScript.

## Tech Stack

- **Framework**: Next.js 15.3 with App Router
- **Runtime**: React 19 with TypeScript 5
- **Styling**: Tailwind CSS 4.0
- **Package Manager**: pnpm
- **Database**: AWS DynamoDB (local development support)
- **Build Tool**: Turbopack

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

## Local Database Development

For local development with DynamoDB, see the comprehensive setup guide:

📖 **[Database Setup Guide](./db-setup.md)** - Complete instructions for running DynamoDB Local with Docker and seeding test data.

### Quick Database Setup

```bash
# Start local DynamoDB
pnpm db:local

# Visit the setup interface
http://localhost:3000/test_LOCAL
```

## Key Features

- Athlete profile management
- Sports rankings and leaderboards
- Event management system
- World records tracking
- Partner management
- Data visualization with charts
- Server-side and client-side rendering support

## Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build production application
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm db:local` - Start local DynamoDB container
- `pnpm db:setup` - Create required tables
- `pnpm db:seed` - Seed with mock data

## Project Structure

```
src/
├── app/           # Next.js App Router pages & API routes
├── ui/            # Reusable UI components
├── lib/           # Library code and utilities
├── utils/         # Utility functions
├── types/         # TypeScript type definitions
└── mocks/         # Mock data for development
```

## Path Aliases

- `@ui/*` → `src/ui/*`
- `@utils/*` → `src/utils/*`
- `@types/*` → `src/types/*`
- `@mocks/*` → `src/mocks/*`
- `@lib/*` → `src/lib/*`

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Next.js features and API
- [Database Setup Guide](./db-setup.md) - Local DynamoDB development setup