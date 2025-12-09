// Improved data structure for SportHub with embedded participations

import type { Role, UserSubType } from '../types/rbac';

export interface EventParticipation {
  eventId: string;
  eventName: string;
  place: string;
  points: number;
  date: string;
  discipline: string;
  country: string;
}

export interface UserRecord {
  // Primary key
  userId: string;

  // User type and data
  /**
   * @deprecated Use userSubTypes instead. This field is maintained for backward compatibility
   * during migration. Will be removed in future version.
   * Legacy display classification: 'athlete' | 'official' | 'admin'
   */
  type?: 'athlete' | 'official' | 'admin';
  name: string;
  email: string;
  country?: string;
  createdAt: string;

  // RBAC fields
  role: Role;                      // Primary role for authorization ('user' | 'admin')
  permissions?: string[];           // Granular permissions (future use)
  roleAssignedAt?: string;         // When the role was assigned
  roleAssignedBy?: string;         // Who assigned the role

  /**
   * User sub-types for granular permissions and classification.
   * - organizer: Can create and edit their own events
   * - judge: Reserved for future judging capabilities
   * - athlete: Used for filtering in rankings and displays
   * Users can have multiple sub-types simultaneously.
   */
  userSubTypes?: UserSubType[];
  subTypesAssignedAt?: string;     // When sub-types were last modified
  subTypesAssignedBy?: string;     // Who last modified sub-types

  // Profile metadata
  lastProfileUpdate?: string;      // When profile was last updated
  profileCompleted?: boolean;      // Whether user has completed their profile

  // Aggregated statistics
  totalPoints: number;
  contestsParticipated: number;
  firstCompetition?: string;
  lastCompetition?: string;

  // Embedded event participations (denormalized for read performance)
  eventParticipations: EventParticipation[];

  // Index signature for DynamoDB compatibility
  [key: string]: unknown;
}

export interface EventParticipant {
  userId: string;
  name: string;
  place: string;
  points: number;
}

export interface EventRecord {
  // Primary key
  eventId: string;

  // Event type and data
  type: 'contest' | 'clinic' | 'meetup';
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
  thumbnailUrl?: string;

  // Embedded participants (denormalized for read performance)
  participants: EventParticipant[];
}

// Legacy types for backward compatibility
export interface LegacyUserRecord extends Omit<UserRecord, 'userId'> {
  'rankings-dev-key': string;
  id: string;
  athleteId?: string;
}

export interface LegacyEventRecord extends Omit<EventRecord, 'eventId' | 'participants'> {
  'contests-key': string;
  contestId: string;
  athleteCount: number;
}

export interface LegacyAthleteRecord {
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

// Utility types
export interface UserWithDetails extends UserRecord {
  // Additional computed fields for UI display
  profileImage?: string;
  gender?: 'male' | 'female' | 'other';
  ageCategory?: string;
  disciplines?: string[];
}