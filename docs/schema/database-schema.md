# Database Schema - Detailed Reference

## Overview

SportHub uses a **hierarchical sort key pattern** with AWS DynamoDB, optimized for efficient querying without table scans. The schema separates data into two main tables (Users, Events) plus a reference database for user identity.

## Design Principles

1. **Hierarchical Sort Keys** - Composite sort keys enable efficient filtering (e.g., `Ranking:1:2024:12:1:0`)
2. **Embedded Data** - Denormalize frequently accessed data to eliminate N+1 queries
3. **GSI for Rankings** - Global Secondary Indexes for leaderboard queries
4. **Reference DB Pattern** - Separate user identity from application data
5. **No Table Scans** - All queries use composite keys or GSI lookups

## Users Table

### Table Configuration

**Table Name**: `users-dev` (production: `users-prod`)
**Primary Key**:
- Partition Key: `userId` (String) - Format: `SportHubID:{id}`
- Sort Key: `sortKey` (String) - Hierarchical format

**Global Secondary Indexes**:
1. **userSubType-index**
   - Partition Key: `primarySubType` (String) - e.g., "athlete", "judge"
   - Sort Key: `totalPoints` (Number) - For leaderboard sorting

2. **discipline-rankings-index**
   - Partition Key: `discipline` (String) - e.g., "12" (surfing)
   - Sort Key: `gsiSortKey` (String) - Format: `{paddedPoints}#{userId}`

### Record Types

The Users table uses `sortKey` to distinguish between three record types:

#### 1. Profile Record (sortKey = "Profile")

**Purpose**: Main user profile with aggregated statistics and RBAC data

**Fields**:
```typescript
{
  // Primary Keys
  userId: string                    // "SportHubID:12345"
  sortKey: "Profile"

  // Identity Linkage
  isaUsersId?: string               // Link to isa-users reference DB (e.g., "ISA_FBE8B254")
  athleteSlug?: string              // Slug from ISA-Rankings (e.g., "john-doe")

  // Identity Data (LOCAL DEV ONLY - should come from reference DB in production)
  name?: string
  email?: string

  // RBAC Fields
  role: "admin" | "athlete" | "judge" | "organizer"
  permissions?: string[]
  roleAssignedAt?: string
  roleAssignedBy?: string
  userSubTypes: UserSubType[]       // Can be multiple (e.g., ["athlete", "judge"])
  primarySubType: UserSubType       // For userSubType-index GSI

  // Profile Metadata
  profileUrl?: string
  thumbnailUrl?: string
  infoUrl?: string
  createdAt: number                 // Unix timestamp
  lastProfileUpdate?: number
  profileCompleted?: boolean

  // Aggregated Stats (calculated from participations)
  totalPoints: number               // For userSubType-index GSI (sort key)
  contestCount: number
  firstCompetition?: string
  lastCompetition?: string

  // Judge/Organizer Stats
  totalContestsJudged?: number
  totalEventsOrganized?: number
}
```

**Example**:
```json
{
  "userId": "SportHubID:12345",
  "sortKey": "Profile",
  "isaUsersId": "ISA_FBE8B254",
  "role": "athlete",
  "primarySubType": "athlete",
  "userSubTypes": ["athlete"],
  "totalPoints": 1250,
  "contestCount": 15,
  "createdAt": 1705320000,
  "profileCompleted": true
}
```

#### 2. Ranking Record (sortKey = "Ranking:{type}:{year}:{discipline}:{gender}:{ageCategory}")

**Purpose**: Individual ranking entry for specific category

**Sort Key Format**:
- `type`: "1" (prize money) or "2" (points)
- `year`: "2024", "2023", or "0" (all-time)
- `discipline`: "12" (surfing), "13" (SUP), etc.
- `gender`: "0" (all), "1" (male), "2" (female)
- `ageCategory`: "0" (open), "1" (junior), "2" (master), etc.

**Fields**:
```typescript
{
  // Primary Keys
  userId: string                    // "SportHubID:12345"
  sortKey: string                   // "Ranking:1:2024:12:1:0"

  // Fields from sortKey (denormalized for easy access)
  rankingType: string               // "1" or "2"
  year: string                      // "2024" or "0"
  discipline: string                // "12", "13", etc. (for discipline-rankings-index GSI)
  gender: string                    // "0", "1", "2"
  ageCategory: string               // "0", "1", etc.

  // Ranking Data
  points: string                    // Points/prize as string (e.g., "585", "$ 1000")
  gsiSortKey: string                // For discipline-rankings-index GSI: padded points + userId

  // Metadata
  lastUpdatedAt?: number
}
```

**Example**:
```json
{
  "userId": "SportHubID:12345",
  "sortKey": "Ranking:1:2024:12:1:0",
  "rankingType": "1",
  "year": "2024",
  "discipline": "12",
  "gender": "1",
  "ageCategory": "0",
  "points": "1250",
  "gsiSortKey": "0000001250#SportHubID:12345",
  "lastUpdatedAt": 1705320000
}
```

**GSI Sort Key Format**:
The `gsiSortKey` enables ranking queries sorted by points:
- Format: `{10-digit padded points}#{userId}`
- Example: `"0000001250#SportHubID:12345"`
- Enables efficient descending sort (highest points first)

#### 3. Participation Record (sortKey = "Participation:{contestId}")

**Purpose**: Record of athlete's participation in a specific contest

**Fields**:
```typescript
{
  // Primary Keys
  userId: string                    // "SportHubID:12345"
  sortKey: string                   // "Participation:c5f8a2"

  // Contest Reference
  eventId: string
  contestId: string
  discipline: string

  // Participation Data
  place: number
  points: string

  // Contest Metadata (denormalized for easy access)
  contestDate: string
  contestName: string
}
```

**Example**:
```json
{
  "userId": "SportHubID:12345",
  "sortKey": "Participation:c5f8a2",
  "eventId": "Event:a3637f",
  "contestId": "c5f8a2",
  "discipline": "12",
  "place": 1,
  "points": "100",
  "contestDate": "2024-06-05",
  "contestName": "Men's Open Final"
}
```

## Events Table

### Table Configuration

**Table Name**: `events-dev` (production: `events-prod`)
**Primary Key**:
- Partition Key: `eventId` (String) - Format: `Event:{id}`
- Sort Key: `sortKey` (String) - "Metadata" or "Contest:{discipline}:{contestId}"

**Global Secondary Indexes**:
1. **contestId-index**
   - Partition Key: `contestId` (String)
   - Purpose: Direct contest lookup without knowing eventId

2. **date-discipline-index**
   - Partition Key: `discipline` (String)
   - Sort Key: `dateSortKey` (String) - Format: `{contestDate}#{eventId}`
   - Purpose: Query contests by discipline and date range

### Record Types

#### 1. Event Metadata Record (sortKey = "Metadata")

**Purpose**: Event-level information

**Fields**:
```typescript
{
  // Primary Keys
  eventId: string                   // "Event:a3637f"
  sortKey: "Metadata"

  // Event Info
  eventName: string
  startDate: string                 // ISO date
  endDate: string
  location: string
  country: string
  contestCount: number

  // Metadata
  type?: "competition" | "clinic" | "meetup"
  profileUrl?: string
  thumbnailUrl?: string
  createdAt?: number

  // Organizers (optional)
  organizers?: EventOrganizer[]
}
```

**Example**:
```json
{
  "eventId": "Event:a3637f",
  "sortKey": "Metadata",
  "eventName": "World Surfing Games 2024",
  "startDate": "2024-06-01",
  "endDate": "2024-06-07",
  "location": "El Salvador",
  "country": "El Salvador",
  "contestCount": 8,
  "type": "competition",
  "createdAt": 1705320000
}
```

#### 2. Contest Record (sortKey = "Contest:{discipline}:{contestId}")

**Purpose**: Individual contest with embedded participant data

**Fields**:
```typescript
{
  // Primary Keys
  eventId: string                   // "Event:a3637f"
  sortKey: string                   // "Contest:12:c5f8a2"

  // Contest Identification
  contestId: string                 // For contestId-index GSI
  discipline: string                // For date-discipline-index GSI

  // Contest Info
  contestName: string
  contestDate: string               // ISO date
  dateSortKey: string               // For date-discipline-index GSI: contestDate#eventId

  // Location
  country: string
  city?: string

  // Contest Metadata
  category?: number                 // 1-5 (local to masters)
  gender?: number                   // 0=all, 1=male, 2=female
  prize?: number

  // Media
  profileUrl?: string
  thumbnailUrl?: string
  infoUrl?: string

  // Participants (denormalized for efficient queries)
  athletes: ContestParticipant[]

  // Judges/Organizers (optional)
  judges?: ContestJudge[]
  organizers?: EventOrganizer[]

  // Metadata
  createdAt?: number
}
```

**Embedded Types**:

```typescript
// ContestParticipant
{
  userId: string                    // SportHubID
  isaUsersId?: string               // ISA_XXXXXXXX (optional)
  name: string
  place: string
  points: string
  thumbnailUrl?: string
}

// ContestJudge
{
  userId: string
  name: string
  role?: "head_judge" | "judge" | "assistant"
}

// EventOrganizer
{
  userId: string
  name: string
  role?: "organizer" | "co-organizer"
}
```

**Example**:
```json
{
  "eventId": "Event:a3637f",
  "sortKey": "Contest:12:c5f8a2",
  "contestId": "c5f8a2",
  "discipline": "12",
  "contestName": "Men's Open Final",
  "contestDate": "2024-06-05",
  "dateSortKey": "2024-06-05#Event:a3637f",
  "country": "El Salvador",
  "category": 5,
  "gender": 1,
  "prize": 10000,
  "athletes": [
    {
      "userId": "SportHubID:12345",
      "name": "John Doe",
      "place": "1",
      "points": "100"
    }
  ],
  "createdAt": 1705320000
}
```

## Reference Database (isa-users)

### Table Configuration

**Table Name**: `isa-users`
**Region**: eu-central-1 (separate from main app)
**Primary Key**:
- Partition Key: `PK` (String) - Format: `user:{userId}`
- Sort Key: `SK_GSI` (String) - "userDetails"

**Global Secondary Index**:
- **GSI**: Inverted index for email lookup
  - Partition Key: `SK_GSI` (String) - "userDetails"
  - Sort Key: `GSI_SK` (String) - Format: `email:{email}`

### Record Structure

**Purpose**: Centralized user identity storage

**Fields**:
```typescript
{
  // Primary Keys
  PK: string                        // "user:ISA_FBE8B254"
  SK_GSI: "userDetails"
  GSI_SK: string                    // "email:user@example.com"

  // Cognito Integration
  cognitoSub: string                // Cognito UUID
  cognitoUsername?: string          // Usually same as cognitoSub

  // Identity Data
  name: string
  surname?: string
  phoneNumber?: string
  gender?: string
  country?: string
  city?: string
  birthDate?: string                // ISO date

  // Metadata
  createdDateTime: string           // ISO timestamp
}
```

**Example**:
```json
{
  "PK": "user:ISA_FBE8B254",
  "SK_GSI": "userDetails",
  "GSI_SK": "email:john.doe@example.com",
  "cognitoSub": "uuid-from-cognito-123",
  "name": "John",
  "surname": "Doe",
  "country": "USA",
  "createdDateTime": "2024-01-10T10:30:00Z"
}
```

## Access Patterns

### Users Table Queries

1. **Get user profile** (~10ms)
   ```typescript
   GetItem({ userId: "SportHubID:12345", sortKey: "Profile" })
   ```

2. **Get all user rankings** (~30ms)
   ```typescript
   Query({
     KeyConditionExpression: "userId = :id AND begins_with(sortKey, :prefix)",
     ExpressionAttributeValues: {
       ":id": "SportHubID:12345",
       ":prefix": "Ranking:"
     }
   })
   ```

3. **Get filtered rankings** (~20ms)
   ```typescript
   Query({
     KeyConditionExpression: "userId = :id AND begins_with(sortKey, :prefix)",
     ExpressionAttributeValues: {
       ":id": "SportHubID:12345",
       ":prefix": "Ranking:1:2024:"  // Prize money rankings for 2024
     }
   })
   ```

4. **Get discipline leaderboard** (~50ms)
   ```typescript
   Query({
     IndexName: "discipline-rankings-index",
     KeyConditionExpression: "discipline = :discipline",
     ExpressionAttributeValues: { ":discipline": "12" },
     ScanIndexForward: false
   })
   ```

## Performance Considerations

### Batch Operations
- **BatchGetItem**: 10x faster than sequential queries
- Supports up to 100 items per request
- Auto-chunked in service layer

### Projection Expressions
- Reduce data transfer by ~70%
- Only fetch needed fields

### Caching
- Profile data: 5-minute TTL
- Rankings: 2-minute TTL
- Contest data: 10-minute TTL

## Type Definitions

All schema types are defined in `sport-hub/src/lib/relational-types.ts`:
- `UserProfileRecord`
- `AthleteRankingRecord`
- `AthleteParticipationRecord`
- `EventMetadataRecord`
- `ContestRecord`
- `ReferenceUserIdentity`
