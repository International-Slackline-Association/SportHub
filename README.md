![](/sport-hub/public/favicon.ico)

[![](https://dcbadge.limes.pink/api/server/ugeS27zcuD)](https://discord.gg/ugeS27zcuD)

# ISA SportHub

Next.js application for sports management, athlete profiles, and competition rankings.

## Tech Stack

| | |
|---|---|
| Framework | Next.js 15.3 — App Router |
| Runtime | React 19 + TypeScript 5 |
| Styling | Tailwind CSS 4.0 |
| Package Manager | pnpm (run all commands from `sport-hub/`) |
| Database | AWS DynamoDB + local Docker dev |
| Auth | NextAuth v5 + AWS Cognito |
| Hosting | AWS Amplify |

## Quick Start

```bash
cd sport-hub

# Install dependencies
pnpm install

# Start local database
pnpm db:local && pnpm db:setup && pnpm db:seed

# Start dev server
pnpm dev
# → http://localhost:3000
```

## Project Structure

```
SportHub/
├── sport-hub/        # Next.js application
│   ├── src/
│   │   ├── app/      # Pages & API routes (App Router)
│   │   ├── ui/       # Reusable components
│   │   ├── lib/      # Services, auth, DB clients
│   │   ├── types/    # TypeScript definitions
│   │   └── mocks/    # Seed data
│   └── CLAUDE.md     # AI developer reference (see docs/README.md)
├── docs/             # Architecture, API reference, guides
└── mempalace.yaml    # AI memory palace config
```

## Path Aliases (sport-hub/src)

`@ui/*` · `@utils/*` · `@types/*` · `@mocks/*` · `@lib/*`

## Common Commands

```bash
# Dev
pnpm dev              # Turbopack dev server
pnpm build            # Production build
pnpm lint

# Database
pnpm db:local         # Start DynamoDB container
pnpm db:setup         # Create tables
pnpm db:seed          # Load 200 athletes / 40 contests
pnpm db:reset         # Clear + reseed
pnpm db:gui           # Admin UI → localhost:8001

# Production sync
pnpm sync:compare     # Diff local vs remote
pnpm sync:all         # Push to remote
pnpm sync:recreate    # Recreate remote (destructive)

# ISR revalidation
pnpm revalidate:all
```

## Documentation

All architecture decisions, API references, and developer guides live in [`docs/`](docs/README.md).

Start there for: database schema, auth setup, deployment, AI tooling, and new machine onboarding.
