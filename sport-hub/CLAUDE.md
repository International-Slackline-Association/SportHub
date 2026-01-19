# SportHub - Project Information for Claude

## Project Overview
SportHub is a Next.js application for sports management and athlete profiles, built with React 19 and TypeScript.

## Tech Stack
- **Framework**: Next.js 15.3 with App Router
- **Runtime**: React 19 with TypeScript 5
- **Styling**: Tailwind CSS 4.0
- **Package Manager**: pnpm
- **Database**: AWS DynamoDB
- **Build Tool**: Turbopack

## Key Dependencies
- `@aws-sdk/client-dynamodb` - AWS DynamoDB integration
- `@tanstack/react-table` - Data table functionality
- `recharts` - Data visualization
- `class-variance-authority` - Component variants
- `clsx` & `tailwind-merge` - Utility classes

## Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── athlete-profile/    # Athlete profile pages
│   ├── rankings/          # Rankings and leaderboards
│   ├── events/            # Event management
│   ├── world_records/     # World records display
│   ├── judging/           # Judging interfaces
│   ├── partners/          # Partner management
│   ├── demo/              # Component demo page
│   └── api/               # API routes
├── ui/                    # Reusable UI components
│   ├── Button/            # Button components
│   ├── Badge/             # Badge components
│   ├── Table/             # Data table components
│   ├── Navigation/        # Navigation components
│   ├── ProfileCard/       # Profile display components
│   ├── PageLayout/        # Standard page layout component
│   └── ...
├── lib/                   # Library code and utilities
├── utils/                 # Utility functions
├── types/                 # TypeScript type definitions
└── mocks/                 # Mock data for development
```

## Path Aliases
- `@ui/*` → `src/ui/*`
- `@utils/*` → `src/utils/*`
- `@types/*` → `src/types/*`
- `@mocks/*` → `src/mocks/*`
- `@lib/*` → `src/lib/*`

## Development Commands
- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build production application with Turbopack
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Environment
- Development runs on http://localhost:3000
- Uses AWS DynamoDB for data persistence
- Environment variables configured in `.env`

## Key Features
- Athlete profile management
- Sports rankings and leaderboards
- Event management system
- World records tracking
- Partner management
- Data visualization with charts
- Responsive design with Tailwind CSS
- Server-side and client-side rendering support

## Testing & Development
- Test pages available at `/test_SSR` and `/test_CSR`
- Demo page at `/demo` showcases UI components
- Mock data available in `src/mocks/`

## Local DynamoDB Testing

### Quick Start
1. **Start Local DynamoDB**: `pnpm db:local`
2. **Seed with Mock Data**: `pnpm db:seed`
3. **Start Development**: `pnpm test:local`
4. **Visit Test Page**: http://localhost:3000/test_LOCAL

### Available Commands
- `pnpm db:local` - Start local DynamoDB container
- `pnpm db:setup` - Create required tables
- `pnpm db:seed` - Seed with mock contest/athlete data
- `pnpm db:reset` - Clear and reseed all data
- `pnpm db:clear` - Clear all data only
- `pnpm db:count` - Show record counts in all tables
- `pnpm db:gui` - Launch DynamoDB Admin GUI on port 8001
- `pnpm db:stop` - Stop DynamoDB container
- `pnpm db:clean` - Remove container and volumes
- `pnpm test:local` - Start dev server with local DB config

### Environment Configuration

**Local Testing** (`.env.local`):
```env
DYNAMODB_LOCAL=true
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
NODE_ENV=development
```

**Development with AWS** (`.env`):
```env
# DynamoDB
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your_actual_key
AWS_SECRET_ACCESS_KEY=your_actual_secret
NODE_ENV=development

# Reference Database
REFERENCE_DB_TABLE=isa-users
REFERENCE_DB_REGION=eu-central-1
LOCAL_REFERENCE_DB=false  # Set true to use local reference DB

# ISA-Rankings (optional - for migrations)
ISA_RANKINGS_TABLE=ISA-Rankings
ISA_RANKINGS_REGION=eu-central-1

# Authentication (Cognito + NextAuth)
COGNITO_CLIENT_ID=your_client_id
COGNITO_CLIENT_SECRET=your_client_secret
COGNITO_REGION=eu-central-1
COGNITO_USER_POOL_ID=your_pool_id
AUTH_SECRET=your_nextauth_secret
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
```

### Test Pages
- `/test_LOCAL` - Comprehensive local DynamoDB testing (setup, seed, query, clear)
- `/test_SSR` - Server-side rendering tests with DynamoDB
- `/test_CSR` - Client-side rendering tests
- `/test-rbac` - RBAC system testing (role assignment, permission checks)
- `/demo` - UI component showcase

**Access Control**: Test pages are restricted to development environments only via `canAccessTestAPI()` middleware.

### Mock Data
The system includes comprehensive mock data from `src/mocks/contests_with_athletes.json`:
- **Athletes**: Converted to users with aggregated statistics
- **Contests**: Sports competitions with detailed information
- **Performance Records**: Individual athlete results per contest

### Database Schema - Hierarchical Sort Key Design

#### Users Table
**Primary Key**: userId (partition), sortKey (sort)
**GSI**: userSubType-index, discipline-rankings-index

**Record Types** (distinguished by sortKey):
- `Profile` - User profile metadata (role, points, contestCount)
  - Links to isa-users table via isaUsersId for identity data
- `Ranking:{type}:{year}:{discipline}:{gender}:{ageCategory}` - Individual rankings
- `Participation:{contestId}` - Contest results

**Example Profile Record**:
```typescript
{
  userId: "SportHubID:12345",
  sortKey: "Profile",
  isaUsersId: "ISA_FBE8B254",      // Link to reference DB
  role: "athlete",
  primarySubType: "athlete",
  totalPoints: 1250,
  contestCount: 15,
  createdAt: 1705320000
}
```

**Example Ranking Record**:
```typescript
{
  userId: "SportHubID:12345",
  sortKey: "Ranking:1:2024:12:1:0",  // Type:Year:Discipline:Gender:AgeCategory
  rankingType: "1",                  // 1=prize money, 2=points
  year: "2024",
  discipline: "12",                  // Surfing
  gender: "1",                       // Male
  ageCategory: "0",                  // Open
  points: "1250",
  gsiSortKey: "0000001250#SportHubID:12345"  // For discipline-rankings-index
}
```

#### Events Table
**Primary Key**: eventId (partition), sortKey (sort)
**GSI**: contestId-index, date-discipline-index

**Record Types**:
- `Metadata` - Event-level information (name, location, dates)
- `Contest:{discipline}:{contestId}` - Contest with embedded participants

**Example Event Metadata**:
```typescript
{
  eventId: "Event:a3637f",
  sortKey: "Metadata",
  eventName: "World Surfing Games 2024",
  startDate: "2024-06-01",
  endDate: "2024-06-07",
  location: "El Salvador",
  contestCount: 8
}
```

**Example Contest Record**:
```typescript
{
  eventId: "Event:a3637f",
  sortKey: "Contest:12:c5f8a2",
  contestId: "c5f8a2",
  discipline: "12",
  contestName: "Men's Open Final",
  contestDate: "2024-06-05",
  athletes: [
    { userId: "SportHubID:12345", name: "John Doe", place: "1", points: "100" },
    // ... more athletes
  ]
}
```

## Reference Database Pattern

SportHub uses a **reference database separation pattern** to manage user identity:

### isa-users Table (eu-central-1)
**Purpose**: Centralized user identity storage (name, email, phone, country)
**Access**: Via `src/lib/reference-db-service.ts`
**User IDs**: Custom format `ISA_XXXXXXXX` (e.g., `ISA_FBE8B254`)

**Record Structure**:
```typescript
{
  PK: "user:ISA_FBE8B254",
  SK_GSI: "userDetails",
  GSI_SK: "email:user@example.com",
  cognitoSub: "uuid-from-cognito",
  name: "John",
  surname: "Doe",
  email: "user@example.com",
  country: "USA",
  // ... other identity fields
}
```

### Benefits
- **Single source of truth**: User identity data stored once, referenced everywhere
- **Reduces duplication**: App database only stores app-specific data (points, rankings)
- **Cross-region support**: Identity can be queried from any region
- **Separation of concerns**: Identity vs. application data clearly separated

### User Onboarding Flow
1. User authenticates via AWS Cognito
2. JWT callback (`src/lib/auth.ts`) checks if user exists in isa-users
3. If new user → creates record in isa-users (generates custom ID)
4. Creates corresponding record in app users table with isaUsersId link
5. Returns custom user ID in session

### Local Development Mode
- Uses `athleteSlug` field for display names (from ISA-Rankings migration)
- Set `LOCAL_REFERENCE_DB=true` to use local reference database
- Identity data optionally stored in user profile for offline development

## Query Patterns & Performance

### Optimized Query Patterns
All queries use composite keys or GSI lookups - **NO TABLE SCANS** in hot paths:

1. **Athlete Profile**: Direct GetItem with `userId` + `sortKey="Profile"` (~10ms)
2. **Athlete Rankings**: Query with `begins_with(sortKey, "Ranking:")` (~30ms)
3. **Athlete Participations**: Query with `begins_with(sortKey, "Participation:")` (~30ms)
4. **Discipline Leaderboard**: Query `discipline-rankings-index` GSI (~50ms)
5. **Athlete Leaderboard**: Query `userSubType-index` GSI (~50ms)
6. **Event Contests**: Query with `begins_with(sortKey, "Contest:")` (~20ms)

### Batch Operations
- **BatchGetItem**: Used for fetching multiple user profiles or identities
- **Performance**: 10x faster than sequential GetItem calls
- **Limit**: 100 items per request (auto-chunked in service layer)
- **Usage**: `getReferenceUsersBatch()`, `getAthleteProfilesBatch()`, `getISAAthletesBatch()`

### Caching Strategy
- **RBAC Roles**: 5-minute TTL (prevents repeated reference DB calls)
- **Rankings Data**: 2-minute TTL (balances freshness vs. performance)
- **Contests Data**: 10-minute TTL with projection expressions
- **Event List**: 5-minute TTL for admin endpoints

### Performance Benchmarks
- **Direct key lookup** (GetItem): ~10ms
- **GSI query** with limit 100: ~50ms
- **Hierarchical query** with pagination: ~20-30ms
- **BatchGetItem** (100 items): ~80ms vs. ~800ms sequential
- **Table scan** (AVOID): 300-2000ms depending on table size

### Query Examples

**Get athlete profile with rankings**:
```typescript
// Single query for profile
const profile = await getAthleteProfile("SportHubID:12345");

// Single query for all rankings (hierarchical filter)
const rankings = await getAthleteRankings("SportHubID:12345", {
  type: "1",      // Prize money rankings
  year: "2024"    // 2024 season only
});
// Returns only matching records via begins_with(sortKey, "Ranking:1:2024:")
```

**Get discipline leaderboard**:
```typescript
// Query GSI - returns top 100 athletes sorted by points
const topAthletes = await getTopAthletesByDiscipline("12", 100, {
  year: "2024",
  gender: "1"
});
// Uses discipline-rankings-index GSI with gsiSortKey for sorting
```

### Testing Workflow
1. Start local DynamoDB: `pnpm db:local`
2. Initialize tables: `pnpm db:setup` (or use web interface)
3. Seed with data: `pnpm db:seed` (loads ~2000+ records)
4. Test operations via `/test_LOCAL` web interface
5. Clean up: `pnpm db:clear` or `pnpm db:reset`

## Layout Standards

### Page Layout Consistency
All pages must use consistent width and spacing patterns to ensure visual consistency across the site.

**Required Pattern for All Pages:**
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
- Every page MUST use the `PageLayout` component or follow the exact same structure
- All content sections MUST use `className="p-4 sm:p-0"` for responsive padding
- This ensures consistent content width across all pages
- Mobile: 1rem padding, Desktop: relies on main layout's 2.5rem padding
- Tables automatically constrain to consistent widths with `table-layout: fixed`

**DO NOT:**
- Create pages with inconsistent padding or width patterns
- Use different container structures that break width consistency
- Allow tables to expand beyond the standard content width

## Notes
- Project uses ES modules (`"type": "module"`)
- Strict TypeScript configuration enabled
- Font optimization with Open Sans
- Incremental builds enabled
- Local DynamoDB data persists between restarts
- Mock data includes real contest results and athlete names