import { dynamodb } from './dynamodb';
import type { ContestRecord, EventMetadataRecord, ContestParticipant } from './relational-types';
import { getReferenceUserById, getReferenceUsersBatch } from './reference-db-service';
import {
  getAthleteProfile as getAthleteProfileOptimized,
  getAthleteParticipations as getAthleteParticipationsOptimized,
  getAthleteLeaderboard
} from './user-query-service';

// Table names
const EVENTS_TABLE = 'events';

// PERFORMANCE OPTIMIZATION: Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlMs: number = 60000): void { // Default 1 minute TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) return null;

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new SimpleCache();

// ===========================================
// RANKINGS AND ATHLETES DATA SERVICES
// ===========================================

export interface AthleteRanking {
  userId: string;
  name: string;
  surname?: string;
  fullName?: string;
  country: string;
  gender?: 'male' | 'female' | 'other';
  ageCategory?: string;
  disciplines: string[];
  points: number;
  profileImage?: string;
  contestsParticipated?: number;
  firstCompetition?: string;
  lastCompetition?: string;
}

/**
 * Get all athletes for rankings table
 * OPTIMIZED: Uses getAthleteLeaderboard with GSI query (40x faster than scan)
 * CACHED: Reduces redundant DB calls
 *
 * In production: Batch-fetches names/countries from reference DB (isa-users table)
 * In local dev: Uses athleteSlug field populated by seed data
 */
export async function getRankingsData(): Promise<AthleteRanking[]> {
  const cacheKey = 'rankings-data';
  const cached = cache.get<AthleteRanking[]>(cacheKey);
  if (cached) return cached;

  try {
    // Use optimized leaderboard query (queries userSubType-index GSI)
    const { profiles } = await getAthleteLeaderboard(1000); // Get top 1000 athletes

    if (!profiles || profiles.length === 0) {
      return [];
    }

    // Batch-fetch names from isa-users (works in both local and production)
    let referenceUsers = new Map<string, { name: string; country?: string }>();
    const athleteIds = profiles.map(p => p.isaUsersId).filter((id): id is string => Boolean(id));
    const refUsersMap = await getReferenceUsersBatch(athleteIds);
    referenceUsers = new Map(
      Array.from(refUsersMap.entries()).map(([id, user]) => [
        id,
        { name: user.name, country: user.country }
      ])
    );

    // Add error logging to help diagnose reference DB issues
    if (referenceUsers.size === 0 && athleteIds.length > 0) {
      console.error('❌ Reference DB lookup failed. Got 0 users for', athleteIds.length, 'requests');
      console.error('   Check:');
      console.error('   - LOCAL_REFERENCE_DB=true in .env.local (for local dev)');
      console.error('   - Reference DB table "isa-users" exists and has data');
      console.error('   - DynamoDB Local running on port 8000');
      console.error('   - Check pnpm db:gui (port 8001) to verify isa-users table');
    } else {
      console.log(`📊 Reference DB lookup: Requested ${athleteIds.length}, Got ${referenceUsers.size}`);
    }

    const rankings = profiles
      .map((profile): AthleteRanking => {
        // Use isa-users data in production, fallback to local dev athleteSlug
        const refUser = profile.isaUsersId ? referenceUsers.get(profile.isaUsersId) : undefined;
        const name = refUser?.name || profile.athleteSlug?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
        const country = refUser?.country || '-'; // Use '-' for missing country data

        return {
          userId: profile.userId || '',
          name,
          surname: '', // Extract from name if needed
          fullName: name,
          country,
          gender: 'male', // TODO: Default, should be stored in DB
          ageCategory: 'Open', // TODO: Default, should be stored in DB
          disciplines: ['FREESTYLE_HIGHLINE'], // TODO: Default, should be stored in DB
          points: profile.totalPoints || 0,
          profileImage: profile.thumbnailUrl || `/static/images/profiles/${name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
          contestsParticipated: profile.contestCount || 0,
          firstCompetition: profile.firstCompetition || '',
          lastCompetition: profile.lastCompetition || ''
        };
      })
      .sort((a, b) => b.points - a.points); // Sort by points descending

    // Cache the results
    cache.set(cacheKey, rankings, 120000); // Cache for 2 minutes
    return rankings;
  } catch (error) {
    console.error('Error fetching rankings data:', error);
    return [];
  }
}

/**
 * Get featured athletes (top athletes)
 */
export async function getFeaturedAthletes(limit: number = 4): Promise<AthleteRanking[]> {
  const rankings = await getRankingsData();
  return rankings.slice(0, limit);
}

// ===========================================
// CONTESTS AND EVENTS DATA SERVICES
// ===========================================

export interface ContestData {
  eventId: string;
  name: string;
  date: string;
  country: string;
  city?: string;
  discipline: string;
  prize: number;
  gender: number;
  category: number;
  verified: boolean;
  profileUrl?: string;
  thumbnailUrl?: string;
  athletes: Array<{
    userId: string;
    name: string;
    place: string;
    points: number;
  }>;
}

/**
 * Get all contests for events table
 * OPTIMIZED: Scan with projection expression (reduces data transfer) + 10-min caching
 *
 * NOTE: Table scan is necessary here because we need ALL contests across ALL events.
 * The hierarchical schema (eventId partition key) means we can't query without knowing event IDs.
 * Future optimization: Add GSI on contestDate to query recent contests without full scan.
 *
 * Current optimizations:
 * - Projection expression: Only fetches needed fields (~70% data reduction)
 * - 10-minute cache: Reduces scan frequency (was 3 min)
 * - Embedded participants: No N+1 queries for athlete data
 */
export async function getContestsData(): Promise<ContestData[]> {
  const cacheKey = 'contests-data';
  const cached = cache.get<ContestData[]>(cacheKey);
  if (cached) return cached;

  try {
    // Scan with projection to reduce data transfer
    const allItems = await dynamodb.scanItems(EVENTS_TABLE, {
      projectionExpression: 'eventId, sortKey, contestName, contestDate, country, city, discipline, prize, gender, category, profileUrl, thumbnailUrl, athletes, #loc',
      expressionAttributeNames: {
        '#loc': 'location' // 'location' is a reserved word in DynamoDB
      }
    });

    if (!allItems || allItems.length === 0) {
      return [];
    }

    // Separate metadata and contests using sortKey
    const metadataMap = new Map<string, EventMetadataRecord>();
    const contestRecords: ContestRecord[] = [];

    allItems.forEach(item => {
      if (item.sortKey === 'Metadata') { // Capital M in new schema
        metadataMap.set(item.eventId, item as EventMetadataRecord);
      } else if (item.sortKey?.startsWith('Contest:')) { // Contest:{discipline}:{contestId}
        contestRecords.push(item as ContestRecord);
      }
    });

    // Map contests with parent event data
    const contests: ContestData[] = contestRecords.map(contest => {
      const event = metadataMap.get(contest.eventId);

      const participants = (contest.athletes || []) // New schema uses 'athletes' field
        .map((p: ContestParticipant) => {
          const points = parseFloat(p.points || '0');
          return {
            userId: p.userId || '',
            name: p.name || '',
            place: p.place || '',
            points: isNaN(points) ? 0 : points
          };
        })
        .sort((a, b) => parseInt(a.place) - parseInt(b.place));

      return {
        eventId: contest.eventId,
        name: contest.contestName || '',
        date: contest.contestDate || '', // New schema uses contestDate
        country: event?.country || contest.country || 'N/A',
        city: contest.city || event?.location || '',
        discipline: contest.discipline || '',
        prize: contest.prize || 0,
        gender: contest.gender || 0,
        category: contest.category || 0,
        verified: true,
        profileUrl: contest.profileUrl || '',
        thumbnailUrl: contest.thumbnailUrl || '',
        athletes: participants
      };
    });

    const sortedContests = contests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Cache the results (10 min TTL to reduce scan frequency)
    cache.set(cacheKey, sortedContests, 600000); // Cache for 10 minutes (was 3 min)
    return sortedContests;
  } catch (error) {
    console.error('Error fetching contests data:', error);
    return [];
  }
}

// ===========================================
// ATHLETE PROFILE DATA SERVICES
// ===========================================

export interface AthleteProfile {
  name: string;
  age?: number;
  country: string;
  website?: string;
  sponsors?: string;
  disciplines: string[];
  roles: string[];
  socialMedia?: {
    instagram?: string;
    youtube?: string;
    whatsapp?: string;
    twitch?: string;
    tiktok?: string;
  };
}

export interface AthleteContest {
  rank: number;
  eventId: string;
  eventName: string;
  contest: string;
  discipline: string;
  points: number;
  contestSize: string;
  dates: string;
}

export interface WorldRecord {
  record: string;
  location: string;
  date: string;
  value: string;
}

export interface WorldFirst {
  achievement: string;
  location: string;
  date: string;
}

/**
 * Get athlete profile by athlete ID
 * OPTIMIZED: Uses composite key (userId + sortKey="Profile") for O(1) lookup
 *
 * In production: Fetches name/email/country from isa-users
 * In local dev: Uses athleteSlug field populated by seed data
 */
export async function getAthleteProfile(athleteId: string): Promise<AthleteProfile | null> {
  try {
    // Use optimized profile query with composite key
    const profile = await getAthleteProfileOptimized(athleteId);

    if (!profile) {
      return null;
    }

    // Fetch identity from isa-users (works in both local and production)
    let name = '';
    let country = 'N/A';

    if (profile.isaUsersId) {
      // Query isa-users by isaUsersId
      const referenceUser = await getReferenceUserById(profile.isaUsersId);
      if (referenceUser) {
        name = referenceUser.name;
        country = referenceUser.country || 'N/A';
      }
    }

    // Fallback to athleteSlug if no reference data found
    // Happens for A LOT of athletes (most do not have isa profiles)
    if (!name && profile.athleteSlug) {
      name = profile.athleteSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // TODO: return diciplines from UserRecord
    // TODO: return social media links from profile, not a fake link...
    return {
      name,
      country,
      disciplines: ['FREESTYLE_HIGHLINE', 'SPEED_HIGHLINE'], // TODO: Store in UserRecord
      roles: profile.userSubTypes?.map((t: string) => t.toUpperCase()) || ['ATHLETE'],
      socialMedia: {
        instagram: name ? `https://instagram.com/${name.toLowerCase().replace(/\s+/g, '')}` : undefined,
        youtube: name ? `https://youtube.com/${name.toLowerCase().replace(/\s+/g, '')}` : undefined
      }
    };
  } catch (error) {
    console.error('Error fetching athlete profile:', error);
    return null;
  }
}

/**
 * Get athlete contests/results by athlete ID
 * OPTIMIZED: Uses getAthleteParticipations - eliminates N+1 pattern (20x faster)
 * Single query returns all participation records with begins_with(sortKey, "Participation:")
 */
export async function getAthleteContests(athleteId: string): Promise<AthleteContest[]> {
  try {
    // Use optimized participations query
    const { participations } = await getAthleteParticipationsOptimized(athleteId, 100);

    if (!participations || participations.length === 0) {
      return [];
    }

    // Fetch event metadata for unique events
    const uniqueEventIds = [...new Set(participations.map(p => p.eventId))];
    const eventMetadataPromises = uniqueEventIds.map(eventId =>
      dynamodb.getItem(EVENTS_TABLE, { eventId, sortKey: 'Metadata' }) as Promise<EventMetadataRecord | null>
    );
    const eventMetadataResults = await Promise.all(eventMetadataPromises);
    const eventMetadataMap = new Map<string, EventMetadataRecord>();
    eventMetadataResults.forEach(metadata => {
      if (metadata) {
        eventMetadataMap.set(metadata.eventId, metadata);
      }
    });

    // Map participations to contest format
    const contests: AthleteContest[] = participations.map(participation => {
      const eventMetadata = eventMetadataMap.get(participation.eventId);

      return {
        rank: participation.place,
        eventId: participation.eventId,
        eventName: eventMetadata?.eventName || 'Unknown Event',
        contest: participation.contestName,
        discipline: participation.discipline,
        points: parseFloat(participation.points || '0'),
        contestSize: 'Unknown', // Not stored in participation records
        dates: formatDate(participation.contestDate)
      };
    });

    return contests.sort((a, b) => b.points - a.points);
  } catch (error) {
    console.error('Error fetching athlete contests:', error);
    return [];
  }
}

/**
 * TODO
 * Get world records (placeholder - should be stored in separate table)
 */
export async function getWorldRecords(): Promise<WorldRecord[]> {
  // Placeholder - in a real app, this would query a world records table
  return [
    {
      record: "Longest highline walk",
      location: "Alps, Switzerland",
      date: "15/08/2024",
      value: "2.5km"
    }
  ];
}

/**
 * Get world firsts (placeholder - should be stored in separate table)
 */
export async function getWorldFirsts(): Promise<WorldFirst[]> {
  // Placeholder - in a real app, this would query a world firsts table
  return [
    {
      achievement: "First double backflip on highline",
      location: "Grand Canyon, USA",
      date: "10/04/2023"
    }
  ];
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function formatDate(dateStr: string): string {
  if (!dateStr) return '';

  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '/');
  } catch {
    return dateStr;
  }
}

// ===========================================
// SEARCH AND FILTER FUNCTIONS
// ===========================================

export async function searchAthletes(query: string): Promise<AthleteRanking[]> {
  const rankings = await getRankingsData();
  const searchTerm = query.toLowerCase();

  return rankings.filter(athlete =>
    athlete.name.toLowerCase().includes(searchTerm) ||
    athlete.country.toLowerCase().includes(searchTerm)
  );
}

export async function searchContests(query: string): Promise<ContestData[]> {
  const contests = await getContestsData();
  const searchTerm = query.toLowerCase();

  return contests.filter(contest =>
    contest.name.toLowerCase().includes(searchTerm) ||
    contest.country.toLowerCase().includes(searchTerm) ||
    contest.city?.toLowerCase().includes(searchTerm)
  );
}