// Improved relational data structure for SportHub

export interface UserRecord {
  // DynamoDB keys
  pk: string;                    // USER#{athleteId}
  sk: string;                    // PROFILE

  // Core user data
  athleteId: string;
  name: string;
  email?: string;
  country?: string;
  createdAt: string;

  // Aggregated statistics (computed from results)
  totalPoints?: number;
  contestsParticipated?: number;
  firstCompetition?: string;
  lastCompetition?: string;

  // Legacy compatibility
  'rankings-dev-key'?: string;   // For backwards compatibility
  id?: string;                   // Alias for athleteId
}

export interface ContestRecord {
  // DynamoDB keys
  pk: string;                    // CONTEST#{contestId}
  sk: string;                    // DETAILS

  // Core contest data
  contestId: string;
  name: string;
  normalizedName: string;
  discipline: string;
  date: string;
  country: string;
  city: string;
  prize: number;
  gender: number;
  category: number;
  createdAt: string;
  profileUrl?: string;

  // Computed statistics
  participantCount?: number;
  athleteCount?: number;         // Alias for participantCount

  // Legacy compatibility
  'contests-key'?: string;       // For backwards compatibility
}

export interface ResultRecord {
  // DynamoDB keys
  pk: string;                    // USER#{athleteId}
  sk: string;                    // RESULT#{contestId}

  // Core result data
  athleteId: string;
  contestId: string;
  place: string;                 // "1", "2", "DNF", etc.
  points: number;
  createdAt: string;

  // GSI for contest-centric queries
  gsi1pk: string;               // CONTEST#{contestId}
  gsi1sk: string;               // USER#{athleteId}#{place}
}

export interface ParticipantRecord {
  // DynamoDB keys
  pk: string;                   // CONTEST#{contestId}
  sk: string;                   // PARTICIPANT#{athleteId}

  // Participant data
  contestId: string;
  athleteId: string;
  place: string;
  points: number;

  // For efficient sorting
  placeNumeric?: number;        // For proper numeric sorting
  createdAt: string;
}

// Legacy compatibility type
export interface AthleteRecord {
  'athletes-key': string;
  athleteId: string;
  name: string;
  contestId: string;
  contestName: string;
  place: string;
  points: number;
  date: string;
  country: string;
  discipline: string;
  createdAt: string;
}

// Lookup utility types
export interface UserWithResults extends UserRecord {
  results: ResultRecord[];
}

export interface ContestWithParticipants extends ContestRecord {
  participants: ParticipantRecord[];
}

export interface UserContestSummary {
  athleteId: string;
  athleteName: string;
  contestId: string;
  contestName: string;
  place: string;
  points: number;
  date: string;
  discipline: string;
}