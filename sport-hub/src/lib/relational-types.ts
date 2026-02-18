// Enhanced data structure for SportHub with hierarchical sort keys
// Optimized for efficient DynamoDB queries using composite sort keys and GSIs

import type { Role, UserSubType } from '../types/rbac';

// ============================================================================
// USERS TABLE RECORDS
// ============================================================================

/**
 * Base interface for all user table records
 */
interface UserTableRecord {
  userId: string;          // PK: "SportHubID:xxxxx"
  sortKey: string;         // SK: "Profile" | "Ranking:*" | "Participation:*"
}

/**
 * User Profile Record (sortKey = "Profile")
 * One per user - contains main profile data and aggregations
 */
export interface UserProfileRecord extends UserTableRecord {
  sortKey: "Profile";

  // Identity linkage
  isaUsersId?: string;     // Link to isa-users reference DB (e.g., "ISA_FBE8B254")
  athleteSlug?: string;    // Slug from ISA-Rankings (e.g., "john-doe")

  // Identity data
  // Note: email is used to link Cognito users to existing sporthub-users records
  // Name/surname stored locally; reference DB (isa-users) is fallback for display.
  // TODO: Sync SportHub DB name/surname with reference DB on edit (not yet implemented)
  name?: string;
  surname?: string;
  email?: string;

  // RBAC fields
  role: Role;
  permissions?: string[];
  roleAssignedAt?: string;
  roleAssignedBy?: string;
  userSubTypes: UserSubType[];
  primarySubType: UserSubType;    // For userSubType-index GSI

  // Profile metadata
  profileUrl?: string;
  thumbnailUrl?: string;
  infoUrl?: string;
  createdAt: number;
  lastProfileUpdate?: number;
  profileCompleted?: boolean;

  // Aggregated stats (calculated from participations)
  totalPoints: number;             // For userSubType-index GSI (sort key)
  contestCount: number;
  firstCompetition?: string;
  lastCompetition?: string;

  // Judge/Organizer stats
  totalContestsJudged?: number;
  totalEventsOrganized?: number;
}

/**
 * Athlete Ranking Record (sortKey = "Ranking:{type}:{year}:{discipline}:{gender}:{ageCategory}")
 * Multiple per athlete - one for each ranking category
 */
export interface AthleteRankingRecord extends UserTableRecord {
  sortKey: string;         // "Ranking:{type}:{year}:{discipline}:{gender}:{ageCategory}"

  // Fields from sortKey (denormalized for easy access)
  rankingType: string;     // "1" = prize money, "2" = points
  year: string;            // "2024" or "0" for all-time
  discipline: string;      // "12" = surfing, etc. (for discipline-rankings-index GSI)
  gender: string;          // "0" = all, "1" = male, "2" = female
  ageCategory: string;     // "0" = open, "1" = junior, etc.

  // Ranking data
  points: string;          // Points/prize money as string (e.g., "585", "$ 1000")
  gsiSortKey: string;      // For discipline-rankings-index GSI: padded points + userId

  // Metadata
  lastUpdatedAt?: number;
}

/**
 * Athlete Participation Record (sortKey = "Participation:{contestId}")
 * Multiple per athlete - one for each contest participated in
 */
export interface AthleteParticipationRecord extends UserTableRecord {
  sortKey: string;         // "Participation:{contestId}"

  // Contest reference
  eventId: string;
  contestId: string;
  discipline: string;

  // Participation data
  place: number;
  points: string;

  // Contest metadata (denormalized for easy access)
  contestDate: string;
  contestName: string;
}

/**
 * Union type for all user table records
 */
export type UserRecord = UserProfileRecord | AthleteRankingRecord | AthleteParticipationRecord;

// ============================================================================
// EVENTS TABLE RECORDS
// ============================================================================

/**
 * Base interface for all events table records
 */
interface EventTableRecord {
  eventId: string;         // PK: "Event:xxxxx" or eventId from contests
  sortKey: string;         // SK: "Metadata" | "Contest:{discipline}:{contestId}"
}

/**
 * Event Metadata Record (sortKey = "Metadata")
 * One per event - contains event-level information
 */
export interface EventMetadataRecord extends EventTableRecord {
  sortKey: "Metadata";

  // Event info
  eventName: string;
  startDate: string;
  endDate: string;
  location: string;
  country: string;
  contestCount: number;

  // Metadata
  type?: 'competition' | 'clinic' | 'meetup';
  profileUrl?: string;
  thumbnailUrl?: string;
  createdAt?: number;

  // Organizers (optional)
  organizers?: EventOrganizer[];
}

/**
 * Contest Record (sortKey = "Contest:{discipline}:{contestId}")
 * Multiple per event - one for each contest in the event
 */
export interface ContestRecord extends EventTableRecord {
  sortKey: string;         // "Contest:{discipline}:{contestId}"

  // Contest identification
  contestId: string;       // For contestId-index GSI
  discipline: string;      // For date-discipline-index GSI

  // Contest info
  contestName: string;
  contestDate: string;
  dateSortKey: string;     // For date-discipline-index GSI: contestDate#eventId

  // Location
  country: string;
  city?: string;

  // Contest metadata
  category?: number;       // 1-5 (local to masters)
  gender?: number;         // 0=all, 1=male, 2=female
  prize?: number;

  // Media
  profileUrl?: string;
  thumbnailUrl?: string;
  infoUrl?: string;

  // Participants (denormalized for efficient queries)
  athletes: ContestParticipant[];

  // Judges/Organizers (optional)
  judges?: ContestJudge[];
  organizers?: EventOrganizer[];

  // Metadata
  createdAt?: number;
}

/**
 * Union type for all events table records
 */
export type EventRecord = EventMetadataRecord | ContestRecord;

// ============================================================================
// EMBEDDED TYPES (used within records)
// ============================================================================

/**
 * Participant embedded in Contest record
 */
export interface ContestParticipant {
  userId: string;          // SportHubID
  isaUsersId?: string;     // ISA_XXXXXXXX (optional)
  name: string;
  surname?: string;
  place: string;
  points: string;
  thumbnailUrl?: string;
}

/**
 * Judge embedded in Contest record
 */
export interface ContestJudge {
  userId: string;
  name: string;
  role?: 'head_judge' | 'judge' | 'assistant';
}

/**
 * Organizer embedded in Event/Contest record
 */
export interface EventOrganizer {
  userId: string;
  name: string;
  role?: 'organizer' | 'co-organizer';
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * User profile with additional computed fields for UI
 */
export interface UserWithDetails extends UserProfileRecord {
  profileImage?: string;
  gender?: 'male' | 'female' | 'other';
  ageCategory?: string;
  disciplines?: string[];
}

/**
 * Helper type for ranking filters
 */
export interface RankingFilter {
  type?: string;           // "1" or "2"
  year?: string;           // "2024", "2023", "0" (all-time)
  discipline?: string;     // "12", "13", etc.
  gender?: string;         // "0", "1", "2"
  ageCategory?: string;    // "0", "1", etc.
}

/**
 * Helper type for contest filters
 */
export interface ContestFilter {
  discipline?: string;
  startDate?: string;
  endDate?: string;
  country?: string;
}
