# Relational Database Design for SportHub

## Current Problems
- Data redundancy in AthleteRecord (names, contest info duplicated)
- No efficient user → entries or contest → participants lookups
- Inconsistent primary key naming

## Proposed Structure

### 1. Users Table (athletes/participants)
```typescript
interface UserRecord {
  pk: string;           // USER#{athleteId}
  sk: string;           // PROFILE
  athleteId: string;    // Unique athlete identifier
  name: string;         // Athlete name
  email?: string;       // Contact info
  country?: string;     // Primary country
  createdAt: string;

  // Aggregated stats (computed from entries)
  totalPoints?: number;
  contestsParticipated?: number;
  firstCompetition?: string;
  lastCompetition?: string;
}
```

### 2. Contests Table
```typescript
interface ContestRecord {
  pk: string;           // CONTEST#{contestId}
  sk: string;           // DETAILS
  contestId: string;
  name: string;
  discipline: string;
  date: string;
  country: string;
  city: string;
  prize: number;
  gender: number;
  category: number;
  createdAt: string;

  // Computed stats
  participantCount?: number;
}
```

### 3. Results Table (athlete performance in specific contest)
```typescript
interface ResultRecord {
  pk: string;           // USER#{athleteId}
  sk: string;           // RESULT#{contestId}

  athleteId: string;    // Reference to User
  contestId: string;    // Reference to Contest
  place: string;        // "1", "2", "DNF", etc.
  points: number;       // Points earned
  createdAt: string;
}
```

### 4. Contest Participants (GSI for contest → participants lookup)
```typescript
interface ParticipantRecord {
  pk: string;           // CONTEST#{contestId}
  sk: string;           // PARTICIPANT#{athleteId}

  contestId: string;
  athleteId: string;
  place: string;
  points: number;

  // GSI keys for reverse lookup
  gsi1pk: string;       // USER#{athleteId}
  gsi1sk: string;       // CONTEST#{contestId}
}
```

## Access Patterns

### User-Centric Queries
1. **Get user profile**: `pk = USER#{athleteId}, sk = PROFILE`
2. **Get all user results**: `pk = USER#{athleteId}, sk begins_with RESULT#`
3. **Get user result in specific contest**: `pk = USER#{athleteId}, sk = RESULT#{contestId}`

### Contest-Centric Queries
1. **Get contest details**: `pk = CONTEST#{contestId}, sk = DETAILS`
2. **Get all contest participants**: `pk = CONTEST#{contestId}, sk begins_with PARTICIPANT#`
3. **Get participant results ordered by place**: Query + sort by points desc

### Cross-References
- **Find all contests for user**: GSI query `gsi1pk = USER#{athleteId}`
- **Find all users in contest**: Query `pk = CONTEST#{contestId}, sk begins_with PARTICIPANT#`

## Benefits
- ✅ No data redundancy
- ✅ Efficient bidirectional lookups
- ✅ Single table design with GSI
- ✅ Consistent naming conventions
- ✅ Scalable access patterns