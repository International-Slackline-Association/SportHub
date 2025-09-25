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
- `pnpm db:count` - Show current data counts
- `pnpm db:stop` - Stop DynamoDB container
- `pnpm db:clean` - Remove container and volumes
- `pnpm test:local` - Start dev server with local DB config

### Environment Configuration

**Local Testing** (`.env.local`):
```env
DYNAMODB_LOCAL=true
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=dummy
AWS_SECRET_ACCESS_KEY=dummy
NODE_ENV=development
```

**Development with AWS** (`.env`):
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_actual_key
AWS_SECRET_ACCESS_KEY=your_actual_secret
NODE_ENV=development
```

### Test Pages
- `/test_LOCAL` - Comprehensive local DynamoDB testing interface
- `/test_SSR` - Server-side rendering tests with DynamoDB
- `/test_CSR` - Client-side rendering tests with DynamoDB

### Mock Data
The system includes comprehensive mock data from `src/mocks/contests_with_athletes.json`:
- **Athletes**: Converted to users with aggregated statistics
- **Contests**: Sports competitions with detailed information
- **Performance Records**: Individual athlete results per contest

### Database Schema
- **Rankings Table**: User profiles with contest statistics
- **Contests Table**: Competition details and metadata
- **Athletes Table**: Individual performance records

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