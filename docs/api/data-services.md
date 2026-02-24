# Data Services API Reference

## Overview

The data services layer (`src/lib/data-services.ts`) provides high-level functions for accessing SportHub data with built-in caching, aggregation, and performance optimizations.

## Core Services

### Contests Data

#### `getContestsData()`

Get all contests with aggregated information.

**Signature**:
```typescript
async function getContestsData(): Promise<ContestData[]>
```

**Returns**:
```typescript
interface ContestData {
  contestId: string;
  contestName: string;
  discipline: string;
  date: string;
  country: string;
  city?: string;
  category?: number;
  gender?: number;
  prize?: number;
  location?: string;
  profileUrl?: string;
  thumbnailUrl?: string;
  athletes: ContestParticipant[];
}
```

**Performance**:
- 10-minute cache (reduces DB calls)
- Projection expression (70% data reduction)
- Single query with embedded athlete data (no N+1)

**Example**:
```typescript
const contests = await getContestsData();
// Returns all contests sorted by date (most recent first)
```

**Notes**:
- Uses table scan (necessary to get all contests across all events)
- Optimized with projection expressions and caching
- Returns pre-sorted data (newest first)

### Events Data

#### `getAllEvents()`

Get all events (admin endpoint with caching).

**Signature**:
```typescript
async function getAllEvents(): Promise<{
  success: boolean;
  events: EventRecord[];
}>
```

**Performance**:
- 5-minute cache
- Public endpoint (no auth required)

**Example**:
```typescript
const { success, events } = await getAllEvents();
```

### World Records

#### `getWorldRecords()`

Get world records data.

**Signature**:
```typescript
async function getWorldRecords(): Promise<WorldRecord[]>
```

**Returns**:
```typescript
interface WorldRecord {
  id: string;
  type: string;        // e.g., "Longest Wave"
  record: string;      // e.g., "3.7 km"
  athlete: string;
  date: string;
  location: string;
  discipline: string;
}
```

**Example**:
```typescript
const records = await getWorldRecords();
```

**Note**: Currently returns hardcoded data. Future: query world-records table.

#### `getWorldFirsts()`

Get world firsts data.

**Signature**:
```typescript
async function getWorldFirsts(): Promise<WorldFirst[]>
```

**Returns**:
```typescript
interface WorldFirst {
  id: string;
  achievement: string;
  athlete: string;
  date: string;
  location: string;
  discipline: string;
}
```

**Example**:
```typescript
const firsts = await getWorldFirsts();
```

**Note**: Currently returns hardcoded data. Future: query world-firsts table.

## Athlete Profile

### `getAthleteProfile(athleteId)`

Get a complete athlete profile by athlete ID. Fetches profile data and ranking records in parallel, resolves identity from SportHub DB with fallback to reference DB (isa-users).

**Signature**:
```typescript
async function getAthleteProfile(athleteId: string): Promise<AthleteProfile | null>
```

**Returns**:
```typescript
interface AthleteProfile {
  name: string;
  surname?: string;
  age?: number;              // Calculated from birthdate
  country: string;
  city?: string;
  sponsors?: string;
  disciplines: string[];     // Real disciplines from ranking records (deduplicated)
  roles: string[];
  profileImage?: string;     // From profileUrl or thumbnailUrl in DB
  socialMedia?: {
    instagram?: string;
    youtube?: string;
    facebook?: string;
    whatsapp?: string;
    twitch?: string;
    tiktok?: string;
  };
}
```

**Key behaviors**:
- **Disciplines**: Extracted from `Ranking:*` records using `MAP_DISCIPLINE_ENUM_TO_NAME`. Filters out `OVERALL` (meta-category) and deduplicates generic parents when specific variants exist (e.g., removes `FREESTYLE` if `FREESTYLE_HIGHLINE` is present).
- **Social media**: Read from `socialMedia` field on the profile record (parsed from `infoUrl` during migration).
- **Age**: Calculated from `birthdate` on the profile record.
- **Profile image**: Uses `profileUrl` with `thumbnailUrl` fallback.
- **Identity priority**: SportHub DB name/surname > reference DB (isa-users) > athleteSlug fallback.

### Rankings Data

#### `getRankingsData()`

Get all athletes for the leaderboard table. Returns empty `disciplines` array per athlete (disciplines are only resolved on individual profile pages to avoid N+1 queries).

**Signature**:
```typescript
async function getRankingsData(): Promise<AthleteRanking[]>
```

**Performance**:
- 2-minute cache
- Batch-fetches names from reference DB
- Sorted by points descending

## User Services

See [`user-query-service.md`](user-query-service.md) for complete user/athlete query API.

Quick reference:
- `getAthleteProfile(userId)` - Get user profile (low-level, used by data-services)
- `getAthleteRankings(userId, filters?)` - Get rankings
- `getAthleteParticipations(userId, limit?)` - Get contest history
- `getAthleteProfilesBatch(userIds)` - Batch get profiles

## Reference DB Services

See [`reference-db-service.md`](reference-db-service.md) for complete reference database API.

Quick reference:
- `getReferenceUserById(userId)` - Get identity by custom ID
- `getReferenceUserByEmail(email)` - Get identity by email
- `getReferenceUsersBatch(userIds)` - Batch get identities
- `createReferenceUser(cognitoSub, email, name)` - Create new user

## Caching

### SimpleCache Implementation

The data services layer uses in-memory caching to reduce database calls.

**Usage**:
```typescript
import { cache } from '@lib/data-services';

// Check cache
const cached = cache.get<MyType>('cache-key');
if (cached) return cached;

// Query database
const data = await queryDatabase();

// Set cache with TTL (milliseconds)
cache.set('cache-key', data, 300000);  // 5 minutes
```

**Cache Keys**:
- `contests-data` - All contests (10-min TTL)
- `events-list` - All events (5-min TTL)
- `rbac-role-{userId}` - User roles (5-min TTL)

**Benefits**:
- Reduces database calls by ~80%
- Improves response time from ~50ms to ~5ms (cache hit)
- Prevents excessive reads on frequently accessed data

## Performance Guidelines

### 1. Always Use Batch Operations

```typescript
// BAD: N+1 query pattern
for (const userId of userIds) {
  const profile = await getAthleteProfile(userId);
}

// GOOD: Batch query
const profiles = await getAthleteProfilesBatch(userIds);
```

### 2. Leverage Hierarchical Filtering

```typescript
// BAD: Fetch all, filter client-side
const allRankings = await getAthleteRankings(userId);
const filtered = allRankings.filter(r => r.year === '2024');

// GOOD: Filter at database level
const filtered = await getAthleteRankings(userId, { year: '2024' });
```

### 3. Use Projection Expressions

```typescript
// Only fetch needed fields
const contests = await dynamodb.scanItems('events', {
  projectionExpression: 'contestId, contestName, date, country'
});
```

### 4. Implement Caching

```typescript
// Add caching to frequently accessed functions
const CACHE_TTL = 5 * 60 * 1000;  // 5 minutes
const cacheKey = 'my-data';

const cached = cache.get(cacheKey);
if (cached) return cached;

const data = await queryDatabase();
cache.set(cacheKey, data, CACHE_TTL);

return data;
```

## Error Handling

All service functions handle errors gracefully:

```typescript
try {
  const data = await getContestsData();
  return data;
} catch (error) {
  console.error('Error fetching contests:', error);
  return [];  // Return empty array instead of throwing
}
```

**Benefits**:
- Prevents app crashes on database errors
- Logs errors for debugging
- Returns sensible defaults

## Type Safety

All functions are fully typed with TypeScript:

```typescript
// Strong typing ensures correctness
const contests: ContestData[] = await getContestsData();

// TypeScript catches errors at compile time
contests[0].contestId;  // ✅ Valid
contests[0].invalidField;  // ❌ TypeScript error
```

## Testing

### Unit Tests

```typescript
describe('Data Services', () => {
  it('should fetch contests with caching', async () => {
    const contests1 = await getContestsData();
    const contests2 = await getContestsData();  // Should hit cache

    expect(contests1).toEqual(contests2);
    // Verify only one DB query was made
  });
});
```

### Integration Tests

Test against local DynamoDB:

```typescript
beforeAll(async () => {
  await setupLocalDB();
  await seedTestData();
});

it('should return sorted contests', async () => {
  const contests = await getContestsData();

  // Verify sorting (newest first)
  for (let i = 0; i < contests.length - 1; i++) {
    expect(contests[i].date >= contests[i + 1].date).toBe(true);
  }
});
```

## Migration Notes

### From Separate Tables to Hierarchical Schema

The data services layer abstracts away schema changes:

**Before**:
- Separate tables for contests, athletes, participations
- N+1 queries to fetch related data
- Complex joins in application code

**After**:
- Single events table with hierarchical sort keys
- Embedded athlete data in contest records
- Simple queries with service layer abstraction

**Migration Impact**:
- Data services API remained stable
- Updated implementation under the hood
- Existing code continues to work

## Summary

The data services layer provides:
- **High-level API** for common data operations
- **Built-in caching** for performance
- **Type safety** with TypeScript
- **Error handling** for reliability
- **Performance optimizations** (batch, projection, hierarchical filtering)

For detailed query patterns, see [query-patterns.md](../schema/query-patterns.md).
