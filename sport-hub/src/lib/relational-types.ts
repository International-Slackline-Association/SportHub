// Enhanced data structure for SportHub with hierarchical sort keys
// Optimized for efficient DynamoDB queries using composite sort keys and GSIs

import { PendingUserData } from 'src/app/events/submit/types';
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
  athleteSlug?: string;    // Canonical URL slug (e.g., "john-doe"), unique via athleteSlug-index GSI.
                           // Set from ISA-Rankings on migrated users, or generated from name/surname
                           // on onboarding/enrichment/creation for everyone else.

  // Identity data
  // Note: email is used to link Cognito users to existing sporthub-users records
  // Name/surname stored locally; reference DB (isa-users) is fallback for display.
  // TODO: Sync SportHub DB name/surname with reference DB on edit (not yet implemented)
  name?: string;
  surname?: string;
  email?: string;
  country?: string;
  city?: string;
  birthdate?: string;
  gender?: string;

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
  links?: string[];
  createdAt: number;
  lastProfileUpdate?: number;
  profileCompleted?: boolean;

  // Aggregated stats (calculated from participations)
  totalPoints: number;             // For userSubType-index GSI (sort key)
  contestCount: number;

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

type EventStatus = 'draft' | 'pending' | 'published' | 'cancelled';

/**
 * Event Metadata Record (sortKey = "Metadata")
 * One per event - contains event-level information
 */
export interface EventMetadataRecord extends EventTableRecord {
  // Event info
  eventName: string;
  startDate: string;
  endDate: string;
  city?: string;
  country: string;
  contestCount: number;
  links: string[];

  // Metadata
  type?: 'competition' | 'clinic' | 'meetup';
  profileUrl?: string;
  thumbnailUrl?: string;
  createdAt?: number;
  createdBy?: string;
  createdByName?: string;
  status?: EventStatus;

  // Organizers (optional)
  organizers?: EventOrganizer[];

  disciplines?: string[];  // Optional list of disciplines for the event (not used in queries)

  // Optional embedded contests for convenience (not used in queries)
  // Currently no records have these values, but they could in the future
  contests?: ContestRecord[];  

  // Old format
  name?: string;
}

/**
 * Contest Record (sortKey = "Contest:{discipline}:{contestId}")
 * Multiple per event - one for each contest in the event
 */
export interface ContestRecord extends EventTableRecord {
  // Contest identification
  contestId: string;       // For contestId-index GSI
  discipline: string;      // For date-discipline-index GSI

  // Contest info
  startDate: string;
  endDate: string;
  contestDate: string;
  dateSortKey: string;     // For date-discipline-index GSI: contestDate#eventId

  // Location
  city?: string;

  // Contest metadata
  gender?: string;         // "MEN_ONLY" | "WOMEN_ONLY" | "MIXED"
  ageCategory?: string;    // e.g. "ALL"
  contestSize?: string;    // "WORLD_CHAMPIONSHIP" | "WORLD_CUP" | "MASTERS" | "GRAND_SLAM" | "OPEN" | "CHALLENGE"
  prize?: number;

  // Media
  profileUrl?: string;
  thumbnailUrl?: string;
  infoUrl?: string;

  // Participants (denormalized for efficient queries)
  results: ContestResult[];

  // Judges/Organizers (optional)
  judges?: ContestJudge[];
  organizers?: EventOrganizer[];
  judgingSystem?: JudgingSystem;

  // Metadata
  createdAt?: number;
  contestIndex?: number;
}

/**
 * Pending Score Edit Record (sortKey = "PendingScoreEdit:{discipline}:{idx}")
 * One per contest being edited — mirrors the target Contest record's suffix.
 * Staged proposed changes to an already-published contest's judges/results,
 * awaiting admin approval before being applied to the live Contest record.
 * First-time submission of results (contest currently has none) bypasses
 * staging entirely and writes straight through — this record type only
 * exists for edits to already-submitted results.
 */
export interface PendingScoreEditRecord extends EventTableRecord {
  sortKey: string;          // `PendingScoreEdit:${discipline}:${idx}`
  contestSortKey: string;   // the live Contest:* record this targets
  contestIndex: number;
  proposedJudges: ContestJudge[];
  proposedResults: ContestResult[];
  // Snapshot of the live contest's judges/results taken before the FIRST
  // pending edit in a chain — preserved across re-edits so the admin always
  // diffs against the true pre-edit baseline, not an intermediate state.
  previousJudges: ContestJudge[];
  previousResults: ContestResult[];
  submittedBy: string;
  submittedByName: string;
  submittedAt: number;
  status: 'pending';
  eventName: string;
  discipline?: string;
}

/**
 * Union type for all events table records
 */
export type EventRecord = EventMetadataRecord | ContestRecord | PendingScoreEditRecord;

// ============================================================================
// RECORDS TABLE RECORDS (world records & world firsts)
// ============================================================================

/**
 * Base interface for all records table items.
 * PK patterns: "RecordCategory" | "FirstCategory" | "Record:{id}" | "First:{id}" | "ImportIssue"
 */
interface RecordsTableItem {
  pk: string;
  sortKey: string;
}

export type RecordCategoryStatus = 'active' | 'unchallenged' | 'archived';
export type FirstCategoryStatus = 'active' | 'archived';

/** Claim lifecycle. "historical" only applies to records (a first cannot be beaten). */
export type ClaimStatus = 'draft' | 'pending' | 'changes_requested' | 'published' | 'rejected' | 'historical';

export const RECORD_CATEGORY_GROUPS = ['Length', 'Endurance', 'Speed', 'Altitude', 'Other'] as const;
export type RecordCategoryGroup = (typeof RECORD_CATEGORY_GROUPS)[number];

/**
 * Record category (pk = "RecordCategory", sortKey = "RecordCategory:{categoryId}")
 * Flat list managed by admins. All categories share one partition so the whole
 * list loads with a single query.
 */
export interface RecordCategoryRecord extends RecordsTableItem {
  pk: 'RecordCategory';
  categoryId: string;
  name: string;
  description?: string;
  group: RecordCategoryGroup;
  direction: 'higher' | 'lower'; // Which way is better
  unit: string;                  // Free text. "m", "s" (time), "count" and "°" (coordinates) get dedicated parsing (unitKind)
  status: RecordCategoryStatus;
  order: number;                 // Display order
  createdAt: number;
  updatedAt: number;
}

/** World first category (pk = "FirstCategory", sortKey = "FirstCategory:{categoryId}") */
export interface FirstCategoryRecord extends RecordsTableItem {
  pk: 'FirstCategory';
  categoryId: string;
  name: string;                  // "Trickline" | "Highline Freestyle" | "Rodeoline" | "Static"
  terminationRule?: string;      // When the trick counts as landed (control at termination)
  status: FirstCategoryStatus;
  order: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Athlete on a record or first. Gender and country are a snapshot taken at
 * submission (or from the sheet on import) so a published entry keeps the
 * values that applied at the time.
 */
export interface EntryAthlete {
  userId?: string;               // SportHub user; missing only for unmatched imported rows
  name: string;
  gender: 'MEN' | 'WOMEN';
  country?: string;
  certId?: string;               // Certificate id from the ISA sheet (imported entries)
  pendingUser?: PendingUserData; // New athlete entered on the claim; profile created on approval
}

/** A record value: a number in the category's unit, or coordinates. */
export interface RecordValue {
  amount?: number;
  latitude?: number;
  longitude?: number;
  original?: string;             // Free text as submitted or imported (sheet "Specs")
}

export interface RecordWitness {
  name: string;
  email: string;
  phone?: string;
  contact?: string;              // Older claims: one "email or phone" field
  role?: string;                 // Older claims: role during the attempt
}

/** Evidence is links only in v1; "file" is reserved for S3 uploads later. */
export interface RecordEvidence {
  type: 'link' | 'file';
  url: string;
  label?: string;
}

export interface NewCategoryProposal {
  name: string;
  measurement: string;           // What is measured and how
  unit: string;                  // Free text. "m", "s" (time), "count" and "°" (coordinates) get dedicated parsing (unitKind)
  direction: 'higher' | 'lower';
  justification: string;         // Why it is a distinct superlative
}

/** Fields shared by record and first entries. */
interface EntryBase extends RecordsTableItem {
  sortKey: 'Metadata';
  entryId: string;
  status: ClaimStatus;
  statusKey: string;             // "{kind}#{status}" for statusKey-index GSI
  dateSortKey: string;           // "{date}#{entryId}" for GSI sort order
  categoryId: string;
  categoryName: string;          // Snapshot for display
  gender: RecordGender;
  athletes: EntryAthlete[];
  date: string;                  // ISO yyyy-mm-dd ("" when unknown on import)
  locationName?: string;
  locationCountry?: string;
  eventId?: string;
  evidence: RecordEvidence[];
  ethicsConfirmed?: boolean;
  consentConfirmed?: boolean;    // Required when claiming for others or several athletes
  claimantUserId?: string;
  claimantName?: string;
  source: 'claim' | 'import';
  reviewComment?: string;
  submittedAt?: number;
  decidedAt?: number;
  decidedBy?: string;
  voidedAt?: number;             // Set when an admin voids a published entry; only voided entries can be restored
  createdAt: number;
  updatedAt: number;
}

/** World record entry (pk = "Record:{entryId}", sortKey = "Metadata") */
export interface RecordEntryRecord extends EntryBase {
  kind: 'record';
  value: RecordValue;
  setup?: string;
  furtherSpecs?: string;
  witnesses: RecordWitness[];
  noFullVideoReason?: string;
  newCategoryProposal?: NewCategoryProposal;
}

/** World first entry (pk = "First:{entryId}", sortKey = "Metadata") */
export interface FirstEntryRecord extends EntryBase {
  kind: 'first';
  trickName: string;
  description?: string;
  whyFirst?: string;
  similarTricks?: string;
  lineDetails?: string;
  trickGroupId?: string;         // Links the same trick across lists (titles, FR-23b)
}

export type WorldEntryRecord = RecordEntryRecord | FirstEntryRecord;

/** Audit log entry (pk = entry pk, sortKey = "Audit:{iso timestamp}:{suffix}") */
export interface EntryAuditRecord extends RecordsTableItem {
  action: string;                // "submitted" | "approved" | "imported" | "status_changed" | ...
  fromStatus?: ClaimStatus;
  toStatus?: ClaimStatus;
  byUserId?: string;
  byName?: string;
  comment?: string;
  at: number;
}

/**
 * Import review item (pk = "ImportIssue", sortKey = "ImportIssue:{kind}:{certId}:{reason}")
 * Sheet rows an admin needs to look at: no category, unparsed value, no matching user, ...
 */
export interface ImportIssueRecord extends RecordsTableItem {
  pk: 'ImportIssue';
  kind: 'record' | 'first';
  certId: string;
  reason: 'no_category' | 'value_unparsed' | 'no_user_match' | 'first_link_unclear' | 'possible_duplicate' | 'invalid_row';
  detail: string;
  row: Record<string, string>;
  entryId?: string;
  resolved: boolean;
  createdAt: number;
}

/**
 * Per-athlete pointer in the users table (sortKey = "Record:{entryId}" | "First:{entryId}")
 * Lets a profile list its records and firsts without scanning the records table.
 */
export interface AthleteEntryLinkRecord extends UserTableRecord {
  entryId: string;
  kind: 'record' | 'first';
  createdAt: number;
}

// ============================================================================
// EMBEDDED TYPES (used within records)
// ============================================================================

/**
 * Result embedded in Contest record (new format)
 */
export interface ContestResult {
  rank: number; // | undefined
  id?: string;
  name: string; // ?
  isaPoints: number;
  isPending: boolean;
  stats?: string;
  pendingUser?: PendingUserData;
}

/**
 * Participant embedded in Contest record (legacy format, kept for reference)
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
  pendingUser?: PendingUserData;
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
  ageCategory?: string;
  disciplines?: string[];
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
