# SportHub - Developer Reference for Claude

## Project Overview
ISA SportHub is a Next.js application for sports management and athlete profiles, built with React 19 and TypeScript. Features static page generation with ISR, AWS Amplify hosting, Google Sheets integration, and comprehensive DynamoDB tooling.

## Tech Stack
- **Framework**: Next.js 15.3 with App Router
- **Runtime**: React 19 with TypeScript 5
- **Styling**: Tailwind CSS 4.0
- **Package Manager**: pnpm (run all commands from `sport-hub/`)
- **Database**: AWS DynamoDB (local dev + remote production)
- **Authentication**: NextAuth v5 (beta) with AWS Cognito
- **External Data**: Google Sheets API (world records, world firsts)
- **Build Tool**: Turbopack
- **Hosting**: AWS Amplify

## Key Dependencies
- `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb` - DynamoDB client
- `@googleapis/sheets` - Google Sheets API (world records/firsts data)
- `next-auth` v5 beta - Authentication
- `@tanstack/react-query` - Client-side data fetching
- `@tanstack/react-table` - Data tables
- `recharts` - Charts and data visualization
- `formik` + `yup` - Form management and validation
- `class-variance-authority` - Component variants
- `clsx` + `tailwind-merge` - Utility class merging
- `react-circle-flags` - Country flag components
- `react-social-icons` - Social media icons

## Project Structure

```
sport-hub/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── admin/              # Admin pages (event-approval)
│   │   ├── api/                # API routes
│   │   │   ├── auth/           # NextAuth endpoints
│   │   │   ├── athlete/        # Athlete API
│   │   │   ├── events/         # Events API
│   │   │   ├── rankings/       # Rankings API
│   │   │   ├── revalidate/     # On-demand ISR revalidation
│   │   │   ├── users/          # Users API
│   │   │   └── test-local/     # Local DB test endpoints
│   │   ├── athlete-profile/    # Athlete profile pages
│   │   ├── auth/               # Sign-in / auth error pages
│   │   ├── contact/            # Contact page
│   │   ├── dashboard/          # User dashboard
│   │   ├── events/             # Events list (STATIC + ISR)
│   │   │   ├── [eventId]/      # Individual event page
│   │   │   ├── my-events/      # User's events
│   │   │   └── submit/         # Submit new event
│   │   ├── faq/                # FAQ page
│   │   ├── judging/            # Judging interfaces
│   │   ├── partners/           # Partner/sponsor management
│   │   ├── rankings/           # Rankings leaderboard (STATIC + ISR)
│   │   ├── unauthorized/       # 403 page
│   │   ├── world_records/      # World records display (Google Sheets)
│   │   ├── demo/               # UI component showcase
│   │   ├── test_LOCAL/         # Local DynamoDB test UI
│   │   ├── test_SSR/           # SSR tests
│   │   └── test_CSR/           # CSR tests
│   ├── ui/                     # Reusable UI components
│   │   ├── Alert/
│   │   ├── Avatar/
│   │   ├── Badge/
│   │   ├── Button/
│   │   ├── Card/
│   │   ├── CountryFlag/
│   │   ├── Drawer/
│   │   ├── EventDetailsCard/
│   │   ├── FeaturedAthleteCard/
│   │   ├── FeaturedEventCard/
│   │   ├── Footer/
│   │   ├── Form/
│   │   ├── Icons/
│   │   ├── LabelValuePair/
│   │   ├── Modal/
│   │   ├── Navigation/
│   │   ├── PageLayout/         # Standard page wrapper (REQUIRED for all pages)
│   │   ├── SocialMediaLinks/
│   │   ├── SortableList/
│   │   ├── Spinner/
│   │   ├── StackedMediaCard/
│   │   ├── Tab/
│   │   ├── Table/
│   │   ├── Tooltip/
│   │   ├── UserForm/
│   │   └── UserMenu/
│   ├── lib/                    # Library code
│   │   ├── auth.ts             # NextAuth config
│   │   ├── authorization.ts    # Auth helper utilities (getCurrentUser, requireRole, etc.)
│   │   ├── contest-participation-service.ts
│   │   ├── data-services.ts    # Main data access layer
│   │   ├── db-setup.ts         # DynamoDB table initialization
│   │   ├── dynamodb.ts         # DynamoDB client setup
│   │   ├── event-contest-service.ts
│   │   ├── google-sheets.ts    # Google Sheets client (world records/firsts)
│   │   ├── isa-rankings-service.ts
│   │   ├── onboarding.ts       # User onboarding flow
│   │   ├── rbac-service.ts     # Role-based access control
│   │   ├── reference-db-service.ts  # isa-users identity table
│   │   ├── relational-types.ts
│   │   ├── user-query-service.ts
│   │   ├── user-service.ts
│   │   └── migrations/
│   │       ├── seed-local-db.ts                       # DatabaseSeeder class
│   │       ├── seed-from-rankings-data.ts             # Seed transformer
│   │       └── migrate-isa-rankings-to-sporthub.ts    # Live AWS migration
│   ├── utils/                  # Utility functions
│   ├── types/                  # TypeScript type definitions
│   └── mocks/                  # Mock data
│       └── data-exports/
│           └── rankings-seed-data.json  # Anonymised seed data (200 athletes)
├── scripts/
│   ├── sync-dynamodb.ts        # Local ↔ remote DB sync tool
│   └── revalidate-pages.sh     # ISR revalidation helper
└── public/                     # Static assets
```

## Path Aliases
- `@ui/*` → `src/ui/*`
- `@utils/*` → `src/utils/*`
- `@types/*` → `src/types/*`
- `@mocks/*` → `src/mocks/*`
- `@lib/*` → `src/lib/*`

## Development Commands

### Development
```bash
pnpm dev              # Start dev server with Turbopack (localhost:3000)
pnpm build            # Production build with Turbopack
pnpm start            # Start production server
pnpm lint             # Run ESLint
pnpm test:local       # Dev server with local DynamoDB
```

### Database Management
```bash
pnpm db:local         # Start local DynamoDB container (Docker)
pnpm db:setup         # Create required tables
pnpm db:seed          # Seed from rankings-seed-data.json (200 athletes, 40 contests)
pnpm db:reset         # Clear and reseed data
pnpm db:clear         # Clear all data
pnpm db:count         # Show record counts per table
pnpm db:gui           # DynamoDB Admin GUI on port 8001
pnpm db:stop          # Stop DynamoDB container
pnpm db:clean         # Remove container and volumes
```

### Sync to Production
```bash
pnpm sync:compare     # Compare local vs remote schemas
pnpm sync:all         # Sync all data to remote
pnpm sync:recreate    # Recreate remote table (DESTRUCTIVE)
```

### Static Page Revalidation
```bash
pnpm revalidate:all       # Revalidate all static pages
pnpm revalidate:rankings  # Revalidate /rankings
pnpm revalidate:events    # Revalidate /events
```

### AWS Migrations
```bash
pnpm migrate:dry-run      # Dry-run ISA-Rankings migration (local)
pnpm migrate:execute      # Execute ISA-Rankings migration (local)
pnpm migrate:aws:dry-run  # Dry-run on live AWS
pnpm migrate:aws:execute  # Execute on live AWS
```

## Layout Standards — REQUIRED

Every page MUST use `PageLayout` for consistent width/spacing:

```tsx
import PageLayout from '@ui/PageLayout';

export default function YourPage() {
  return (
    <PageLayout
      title="Your Page Title"
      description="Optional description"
      heroImage={{ // optional
        src: "/static/images/hero-image.jpg",
        alt: "Alt text",
        caption: "Optional caption"
      }}
    >
      <section className="p-4 sm:p-0">
        {/* page content */}
      </section>
    </PageLayout>
  );
}
```

**Rules:**
- All pages MUST use `PageLayout`
- All content sections MUST use `className="p-4 sm:p-0"`
- Mobile: 1rem padding; Desktop: relies on layout's 2.5rem padding
- Tables use `table-layout: fixed` to constrain width

**Never** use custom container structures that break width consistency.

## Static Pages with ISR

`/rankings` and `/events` are statically generated with ISR (`revalidate = 3600`).

- Build time: pre-rendered from DynamoDB
- Auto-revalidates every 1 hour
- Manual revalidation: `pnpm revalidate:*` or via `/api/revalidate`
- After data changes in production: always run `pnpm revalidate:all`

Build output: pages should show `○` (Static), not `ƒ` (Dynamic).

## Google Sheets Integration

`/world_records` fetches data from Google Sheets via `src/lib/google-sheets.ts`.

- **Sheets**: "World Records" and "World Firsts" tabs
- **Auth**: Google service account (lazy-initialized, throws at call time not import time)
- **Required env vars**: `ISA_CERTIFICATES_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

## Database Schema

### Users Table (`sporthub-users` / `sporthub-users-dev`)
**Primary Key**: `userId` (partition) + `sortKey` (sort)
**GSI**: `userSubType-index`, `discipline-rankings-index`

Sort key patterns:
- `Profile` — user profile metadata, links to `isa-users` via `isaUsersId`
- `Ranking:{type}:{year}:{discipline}:{gender}:{ageCategory}` — ranking records
- `Participation:{contestId}` — contest results

### Events Table (`sporthub-events` / `sporthub-events-dev`)
**Primary Key**: `eventId` (partition) + `sortKey` (sort)
**GSI**: `contestId-index`, `date-discipline-index`

Sort key patterns:
- `Metadata` — event-level info (name, location, dates)
- `Contest:{discipline}:{contestId}` — contest with embedded participants

### Reference DB (`isa-users`, eu-central-1)
Centralized user identity (name, email, country). Accessed via `reference-db-service.ts`. Kept separate from application data — app table stores only app-specific fields (points, rankings) and links via `isaUsersId`.

## Authentication & RBAC

- NextAuth v5 (beta) with AWS Cognito provider
- Auth config: `src/lib/auth.ts`
- Authorization helpers: `src/lib/authorization.ts` (`getCurrentUser`, `requireRole`, `requirePermission`)
- RBAC service: `src/lib/rbac-service.ts`
- Roles: `admin`, `athlete`, `judge`, `organizer`
- Protected routes via middleware; test pages restricted to dev only via `canAccessTestAPI()`

## Environment Configuration

### Local (`.env.local`)
```env
DYNAMODB_LOCAL=true
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret
LOCAL_REFERENCE_DB=false
```

### Production (`.env.production` / Amplify console)
```env
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
COGNITO_CLIENT_ID=your_client_id
COGNITO_CLIENT_SECRET=your_client_secret
COGNITO_ISSUER=https://cognito-idp.eu-central-1.amazonaws.com/your_pool_id
AUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://your-app.com
REVALIDATE_SECRET=your_revalidation_secret
NEXT_PUBLIC_URL=https://your-app.com
REFERENCE_DB_TABLE=isa-users
REFERENCE_DB_REGION=eu-central-1
ISA_CERTIFICATES_SPREADSHEET_ID=your_sheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_sa@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
```

## Local Development Workflow

```bash
# 1. Start local database
pnpm db:local

# 2. Setup and seed
pnpm db:setup
pnpm db:seed   # Loads ~200 athletes, 40 contests from rankings-seed-data.json

# 3. Start dev server
pnpm dev       # or pnpm test:local for local DB mode

# 4. Test interface
open http://localhost:3000/test_LOCAL
```

## Test Pages
- `/test_LOCAL` — DynamoDB test UI (setup, seed, query, stats)
- `/test_SSR` — Server-side rendering tests
- `/test_CSR` — Client-side rendering tests
- `/demo` — UI component showcase
- All test pages restricted to `NODE_ENV=development` via `canAccessTestAPI()`

## Important Notes

- Project uses ES modules (`"type": "module"` in package.json)
- Strict TypeScript enabled
- Local DynamoDB data persists between restarts in `sport-hub/dynamodb-data/`
- No table scans in hot paths — all queries use composite keys or GSI lookups
- `sync:export` and `sync:import` commands in README refer to `sync:all` in the actual package.json
- Seed data (`rankings-seed-data.json`) is anonymised — no real personal data committed
