// import { UserSubType } from '@types/rbac';
import type { ContestRecord, EventMetadataRecord, ContestParticipant } from './relational-types';
import {
  getAthleteProfile as getAthleteProfileOptimized,
  getAthleteParticipations as getAthleteParticipationsOptimized,
  getAthleteRankings,
  getAllUserProfiles,
  getAthleteProfilesBatch,
} from './user-query-service';
import { dynamodb, USERS_TABLE } from './dynamodb';
import { getEvent, getContest, scanAllEventItems } from './event-contest-service';
import { MAP_DISCIPLINE_ENUM_TO_NAME, MAP_CONTEST_TYPE_ENUM_TO_NAME, MAP_CONTEST_GENDER_ENUM_TO_NAME } from '@utils/consts';

// Reverse lookups: name → numeric enum (for mapping new-format string values back to ContestData numbers)
const CONTEST_GENDER_NAME_TO_ENUM: Record<string, number> = Object.fromEntries(
  Object.entries(MAP_CONTEST_GENDER_ENUM_TO_NAME).map(([num, name]) => [name, Number(num)])
);
const CONTEST_TYPE_NAME_TO_ENUM: Record<string, number> = Object.fromEntries(
  Object.entries(MAP_CONTEST_TYPE_ENUM_TO_NAME).map(([num, name]) => [name, Number(num)])
);
import { UserRecord } from './relational-types';
import { getWorldRecordsSheet, getWorldFirstsSheet } from './google-sheets';

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

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new SimpleCache();

// Export cache utilities
export const invalidateUsersCache = () => {
  // Clear all user caches regardless of subtype
  ['', 'athlete', 'admin'].forEach(subtype => {
    cache.delete(`users-data-${subtype}`);
  });
};

export const invalidateContestsCache = () => {
  cache.delete('contests-data');
};

// ===========================================
// USER DATA SERVICES
// ===========================================
export async function getUsers({ subtype }: { subtype: string }): Promise<Partial<UserRecord>[]> {
  const cacheKey = `users-data-${subtype}`;
  const cached = cache.get<UserRecord[]>(cacheKey);
  if (cached) return cached;

  try {
    const items = await getAllUserProfiles();
    if (!items || items.length === 0) {
      return [];
    }

    const users = items
      .filter(item => item.name || item.surname || item.athleteSlug)
      .map(userRecord => ({
        name: (userRecord.name || userRecord.athleteSlug || '') as string,
        surname: (userRecord.surname || '') as string,
        userId: (userRecord.userId || '') as string,
      }));

    // Cache the results
    cache.set(cacheKey, users, 120000); // Cache for 2 minutes

    return users;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return [];
  }
}

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
  age?: number;
  disciplines: string[];
  points: number;
  profileImage?: string;
  contestsParticipated?: number;
  firstCompetition?: string;
  lastCompetition?: string;
}

function mapProfileToRanking(profile: Record<string, unknown>, points?: number): AthleteRanking {
  const name = (profile.name as string) || (profile.athleteSlug as string)?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';
  const surname = (profile.surname as string) || '';
  const country = (profile.country as string) || '-';
  const fullName = `${name} ${surname}`.trim();
  const birthdate = profile.birthdate as string | undefined;
  const age = (() => {
    if (!birthdate) return undefined;
    const birth = new Date(birthdate);
    const now = new Date();
    let a = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) a--;
    return a;
  })();
  return {
    userId: (profile.userId as string) || '',
    name,
    surname,
    fullName,
    country,
    gender: (profile.gender as 'male' | 'female' | undefined) ?? undefined,
    ageCategory: 'Open',
    age,
    disciplines: [],
    points: points ?? (profile.totalPoints as number) ?? 0,
    profileImage: (profile.thumbnailUrl as string) || (profile.profileUrl as string) || undefined,
    contestsParticipated: (profile.contestCount as number) || 0,
    firstCompetition: (profile.firstCompetition as string) || '',
    lastCompetition: (profile.lastCompetition as string) || '',
  };
}

/**
 * Aggregate season-specific points from Participation records.
 * Participation records store per-contest points and contestDate, making them
 * the authoritative source for season totals (unlike Ranking records which
 * may store all-time aggregates depending on how they were seeded/migrated).
 */
async function getRankingsForYears(years: string[], discipline?: string): Promise<AthleteRanking[]> {
  const yearsSet = new Set(years);

  // Scan all participation records — filter by contestDate year and discipline client-side
  const participations = await dynamodb.scanItems(USERS_TABLE, {
    filterExpression: 'begins_with(sortKey, :pfix)',
    expressionAttributeValues: { ':pfix': 'Participation:' },
    projectionExpression: 'userId, #pts, contestDate, discipline',
    expressionAttributeNames: { '#pts': 'points' },
  });

  const pointsMap = new Map<string, number>();
  for (const item of participations) {
    const contestDate = item.contestDate as string | undefined;
    if (!contestDate) continue;
    const year = contestDate.substring(0, 4);
    if (!yearsSet.has(year)) continue;
    if (discipline && item.discipline !== discipline) continue;

    const userId = item.userId as string;
    const pts = parseFloat((item.points as string) || '0');
    pointsMap.set(userId, (pointsMap.get(userId) ?? 0) + pts);
  }

  if (pointsMap.size === 0) return [];

  const profilesMap = await getAthleteProfilesBatch([...pointsMap.keys()]);

  return [...pointsMap.entries()]
    .map(([userId, pts]) => {
      const profile = profilesMap.get(userId);
      if (!profile) return null;
      return mapProfileToRanking(profile as unknown as Record<string, unknown>, pts);
    })
    .filter((r): r is AthleteRanking => r !== null)
    .sort((a, b) => b.points - a.points);
}

/**
 * Get athletes for the rankings table, optionally scoped to a specific year.
 * - year = undefined or 'last3years': aggregate the 3 most recent competition years
 * - year = '2024' (or any specific year): aggregate that year's Ranking records
 */
export async function getRankingsData(year?: string, discipline?: string): Promise<AthleteRanking[]> {
  const currentYear = new Date().getFullYear();
  const resolvedYears = (!year || year === 'last3years')
    ? [String(currentYear), String(currentYear - 1), String(currentYear - 2)]
    : [year];

  const cacheKey = `rankings-data-${resolvedYears.join(',')}-${discipline ?? 'all'}`;
  const cached = cache.get<AthleteRanking[]>(cacheKey);
  if (cached) return cached;

  try {
    const rankings = await getRankingsForYears(resolvedYears, discipline);
    cache.set(cacheKey, rankings, 120000);
    return rankings;
  } catch (error) {
    console.error('Error fetching rankings data:', error);
    return [];
  }
}

/**
 * Get featured athletes (top athletes)
 */
export async function getFeaturedAthletes(discipline?: string, limit: number = 3): Promise<AthleteRanking[]> {
  const rankings = await getRankingsData(undefined, discipline);
  return rankings.slice(0, limit);
}

// ===========================================
// CONTESTS AND EVENTS DATA SERVICES
// ===========================================

export interface ContestData {
  eventId: string;
  contestId?: string;
  name: string;
  date: string;
  country: string;
  city?: string;
  discipline: string;
  prize: number;
  gender: number;
  ageCategory: string;
  category: number;
  status?: 'upcoming' | 'recent' | 'live'; // TODO: Check with Dylan on adding this attribute
  verified: boolean;
  profileUrl?: string;
  thumbnailUrl?: string;
  athletes: Array<{
    userId: string;
    name: string;
    surname?: string;
    place: string;
    points: number;
  }>;
}

export async function getEventsData(): Promise<EventMetadataRecord[]> {
  const cacheKey = 'events-data';
  const cached = cache.get<EventMetadataRecord[]>(cacheKey);
  if (cached) return cached;

  try {
    // Scan with projection to reduce data transfer
    const allItems = await scanAllEventItems({
      projectionExpression: 'eventId, eventName, sortKey, country, city, profileUrl, thumbnailUrl, startDate, endDate'
    });

    if (!allItems || allItems.length === 0) {
      return [];
    }

    const eventRecords: EventMetadataRecord[] = allItems.filter(item => item.sortKey === 'Metadata') as unknown as EventMetadataRecord[];
    const sortedEvents = eventRecords.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    // Cache the results (10 min TTL to reduce scan frequency)
    cache.set(cacheKey, sortedEvents, 600000); // Cache for 10 minutes (was 3 min)
    return sortedEvents;
  } catch (error) {
    console.error('Error fetching events data:', error);
    return [];
  }
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
    // Scan with projection to reduce data transfer.
    // Covers both old-format Contest:* fields (contestName/athletes) and
    // new-format Contest:* fields (results/contestSize/totalPrizeValue) plus Metadata.
    const allItems = await scanAllEventItems({
      projectionExpression: 'eventId, sortKey, contestName, contestDate, country, city, discipline, prize, gender, ageCategory, category, profileUrl, thumbnailUrl, athletes, results, contestSize, totalPrizeValue, contestIndex, eventName, #eventName, startDate, #eventStatus, contests',
      expressionAttributeNames: {
        '#eventName': 'name',     // reserved word
        '#eventStatus': 'status', // reserved word
      }
    });

    if (!allItems || allItems.length === 0) {
      return [];
    }

    // Separate metadata and contests using sortKey
    const metadataMap = new Map<string, EventMetadataRecord>();
    const contestRecords: ContestRecord[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (allItems as any[]).forEach(item => {
      if (item.sortKey === 'Metadata') {
        metadataMap.set(item.eventId, item as EventMetadataRecord);
      } else if (item.sortKey?.startsWith('Contest:')) {
        contestRecords.push(item as ContestRecord);
      }
    });

    // Track which events have separate Contest:* records.
    // For these events, Contest:* records are authoritative (more up-to-date than
    // the embedded snapshot in Metadata written by updateEventStatus).
    const eventIdsWithContestRecords = new Set(contestRecords.map(c => c.eventId));

    // Map all Contest:* records — handles both old-format (athletes) and new-format (results)
    const contests: ContestData[] = contestRecords.map(contest => {
      const event = metadataMap.get(contest.eventId);
      const raw = contest as unknown as Record<string, unknown>;

      // contestId may not be stored explicitly on form-submitted contests (only in sortKey).
      // sortKey format: "Contest:{discipline}:{contestId}"
      const contestId = contest.contestId || contest.sortKey.replace(/^Contest:[^:]+:/, '');

      // New-format: written by saveEventContestRecords / updateEventScores
      // Detected by presence of 'results' array (may be empty [])
      if ('results' in raw) {
        const results = (raw.results as Record<string, unknown>[] | undefined) ?? [];
        const athletes = results
          .slice()
          .sort((a, b) => Number(a.rank ?? 999) - Number(b.rank ?? 999))
          .map(r => ({
            userId: String(r.id ?? ''),
            name: String(r.name ?? ''),
            surname: '',
            place: String(r.rank ?? ''),
            points: Number(r.isaPoints ?? 0),
          }));
        const meta = event as unknown as Record<string, unknown>;
        return {
          eventId: contest.eventId,
          contestId,
          name: String(meta?.eventName || meta?.name || ''),
          date: String(raw.startDate || meta?.startDate || ''),
          country: String(meta?.country || 'N/A'),
          city: String(raw.city || meta?.city || ''),
          discipline: String(raw.discipline ?? ''),
          prize: Number(raw.totalPrizeValue ?? raw.prize ?? 0),
          gender: CONTEST_GENDER_NAME_TO_ENUM[String(raw.gender ?? '')] ?? 0,
          ageCategory: String(raw.ageCategory ?? ''),
          category: CONTEST_TYPE_NAME_TO_ENUM[String(raw.contestSize ?? '')] ?? 0,
          verified: true,
          profileUrl: (meta?.profileUrl as string | undefined) || (raw.profileUrl as string | undefined) || '',
          thumbnailUrl: (meta?.thumbnailUrl as string | undefined) || (raw.thumbnailUrl as string | undefined) || '',
          athletes,
        };
      }

      // Old-format: written by seed/migration (contestName, contestDate, athletes)
      // Uses raw cast since ContestRecord no longer has athletes field
      const legacyAthletes = (raw.athletes as ContestParticipant[] | undefined) ?? [];
      const participants = legacyAthletes
        .map((p: ContestParticipant) => {
          const points = parseFloat(p.points || '0');
          return {
            userId: p.userId || '',
            name: p.name || '',
            surname: p.surname || '',
            place: p.place || '',
            points: isNaN(points) ? 0 : points
          };
        })
        .sort((a, b) => parseInt(a.place) - parseInt(b.place));

      return {
        eventId: contest.eventId,
        contestId,
        name: event?.eventName || (raw.contestName as string) || '',
        date: contest.contestDate || '',
        country: event?.country || 'N/A',
        city: contest.city || event?.city || '',
        discipline: contest.discipline || '',
        prize: contest.prize || 0,
        gender: CONTEST_GENDER_NAME_TO_ENUM[String(contest.gender ?? '')] ?? 0,
        ageCategory: String(raw.ageCategory ?? ''),
        category: 0,
        verified: true,
        profileUrl: contest.profileUrl || '',
        thumbnailUrl: contest.thumbnailUrl || '',
        athletes: participants
      };
    });

    // Map published events that only have embedded contests in Metadata
    // (no separate Contest:* records). Skip events that already have Contest:* records
    // above — those are authoritative and more up-to-date.
    const submittedContests: ContestData[] = [];
    metadataMap.forEach((rawMeta) => {
      const meta = rawMeta as unknown as Record<string, unknown>;
      if (meta.status !== 'published') return;
      if (eventIdsWithContestRecords.has(String(meta.eventId ?? ''))) return;
      const embeddedContests = (meta.contests as Record<string, unknown>[] | undefined) ?? [];
      embeddedContests.forEach(contest => {
        const results = (contest.results as Record<string, unknown>[] | undefined) ?? [];
        const athletes = results
          .slice()
          .sort((a, b) => Number(a.rank ?? 999) - Number(b.rank ?? 999))
          .map(r => ({
            userId: String(r.id ?? ''),
            name: String(r.name ?? ''),
            surname: '',
            place: String(r.rank ?? ''),
            points: Number(r.isaPoints ?? 0),
          }));
        submittedContests.push({
          eventId: String(meta.eventId ?? ''),
          contestId: String(contest.contestId ?? ''),
          name: String(meta.name ?? ''),
          date: String(meta.startDate ?? ''),
          country: String(meta.country ?? 'N/A'),
          city: String(meta.city ?? ''),
          discipline: String(contest.discipline ?? ''),
          prize: Number(contest.totalPrizeValue ?? 0),
          gender: CONTEST_GENDER_NAME_TO_ENUM[String(contest.gender ?? '')] ?? 0,
          ageCategory: String(contest.ageCategory ?? ''),
          category: CONTEST_TYPE_NAME_TO_ENUM[String(contest.contestSize ?? '')] ?? 0,
          verified: false,
          athletes,
        });
      });
    });

    const sortedContests = [...contests, ...submittedContests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
  surname?: string;
  age?: number;
  country: string;
  city?: string;
  sponsors?: string;
  disciplines: string[];
  roles: string[];
  profileImage?: string;
  socialMedia?: {
    instagram?: string;
    youtube?: string;
    facebook?: string;
    whatsapp?: string;
    twitch?: string;
    tiktok?: string;
  };
}

export interface AthleteContest {
  rank: number;
  eventId: string;
  contestId: string;
  eventName: string;
  contest: string;
  discipline: string;
  gender?: string;
  ageCategory?: string;
  points: number;
  contestSize: string;
  dates: string;
}

export interface WorldRecord {
  lineType: string;       // e.g. "Highline", "Trickline"
  recordType: string;     // e.g. "Longest", "Highest"
  specs: string;          // e.g. "200m / 80m height"
  name: string;           // Athlete name
  country: string;        // Country name from sheet
  gender: Gender;         // "MEN" | "WOMEN" | "ALL" | "OTHER"
  eventName: string;      // Competition / location where set
  date: string;           // DD/MM/YYYY
  athleteUserId?: string; // Resolved SportHub userId (when ISA Email matches a profile)
}

export interface WorldFirst {
  description: string;    // "description of world first"
  specs: string;
  name: string;
  gender: Gender;         // "MEN" | "WOMEN" | "ALL" | "OTHER"
  date: string;           // DD/MM/YYYY
  country: string;        // Country name from sheet
  typeOfFirst: string;    // "type of first"
  lineType: string;       // "type of line"
  athleteUserId?: string; // Resolved SportHub userId (when ISA Email matches a profile)
}

/**
 * Get athlete profile by athlete ID
 * OPTIMIZED: Uses composite key (userId + sortKey="Profile") for O(1) lookup
 *
 * Uses name/surname/country from sporthub-users Profile; falls back to athleteSlug.
 */
export async function getAthleteProfile(athleteId: string): Promise<AthleteProfile | null> {
  try {
    // Fetch profile, reference user, and rankings in parallel
    const [profile, rankingRecords] = await Promise.all([
      getAthleteProfileOptimized(athleteId),
      getAthleteRankings(athleteId),
    ]);

    if (!profile) {
      return null;
    }

    let name = profile.name || '';
    const surname = profile.surname || '';
    const country = profile.country || 'N/A';

    if (!name && profile.athleteSlug) {
      name = profile.athleteSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // Extract unique disciplines from ranking records
    const disciplineNumbers = new Set(
      rankingRecords.map(r => Number.parseInt(r.discipline, 10))
    );
    // Filter out OVERALL (meta-category) and generic parent disciplines
    // when a more specific variant is present
    const allDisciplines: string[] = [];
    for (const num of disciplineNumbers) {
      const mapped = MAP_DISCIPLINE_ENUM_TO_NAME[num];
      if (mapped && mapped !== 'OVERALL') {
        allDisciplines.push(mapped);
      }
    }
    // Remove generic FREESTYLE if FREESTYLE_HIGHLINE is present
    // Remove generic TRICKLINE if any specific TRICKLINE_* variant is present
    // Remove generic SPEED if SPEED_SHORT or SPEED_HIGHLINE is present
    const hasSpecificTrickline = allDisciplines.some(d => d.startsWith('TRICKLINE_'));
    const hasSpecificSpeed = allDisciplines.some(d => d === 'SPEED_SHORT' || d === 'SPEED_HIGHLINE');
    const disciplines = allDisciplines.filter(d => {
      if (d === 'FREESTYLE' && allDisciplines.includes('FREESTYLE_HIGHLINE')) return false;
      if (d === 'TRICKLINE' && hasSpecificTrickline) return false;
      if (d === 'SPEED' && hasSpecificSpeed) return false;
      return true;
    });

    // Calculate age from birthdate
    let age: number | undefined;
    if (profile.birthdate) {
      const birth = new Date(profile.birthdate);
      const now = new Date();
      age = now.getFullYear() - birth.getFullYear();
      const monthDiff = now.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
    }

    // Use pre-parsed socialMedia from profile
    const socialMedia = profile.socialMedia || undefined;

    return {
      name,
      surname,
      age,
      country,
      city: profile.city || undefined,
      disciplines,
      roles: profile.userSubTypes?.map((t: string) => t.toUpperCase()) || ['ATHLETE'],
      profileImage: profile.profileUrl || profile.thumbnailUrl || undefined,
      socialMedia,
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
    const eventMetadataResults = await Promise.all(uniqueEventIds.map(id => getEvent(id)));
    const eventMetadataMap = new Map<string, EventMetadataRecord>();
    eventMetadataResults.forEach(metadata => {
      if (metadata) {
        eventMetadataMap.set(metadata.eventId, metadata);
      }
    });

    // Fetch contest records to get athlete counts
    // Contest sortKey format: "Contest:{discipline}:{contestId}"
    const contestResults = await Promise.all(
      participations.map(p => getContest(p.eventId, `Contest:${p.discipline}:${p.contestId}`))
    );
    const contestMap = new Map<string, ContestRecord>();
    contestResults.forEach(contest => {
      if (contest) {
        contestMap.set(`${contest.eventId}:${contest.contestId}`, contest);
      }
    });

    // Map participations to contest format
    const contests: AthleteContest[] = participations.map(participation => {
      const eventMetadata = eventMetadataMap.get(participation.eventId);
      const contest = contestMap.get(`${participation.eventId}:${participation.contestId}`);

      return {
        rank: participation.place,
        eventId: participation.eventId,
        contestId: participation.contestId,
        eventName: eventMetadata?.eventName || 'Unknown Event',
        contest: participation.contestName,
        discipline: participation.discipline,
        gender: contest?.gender,
        ageCategory: contest?.ageCategory,
        points: parseFloat(participation.points || '0'),
        contestSize: contest?.contestSize || '',
        dates: formatDate(participation.contestDate)
      };
    });

    return contests.sort((a, b) => b.points - a.points);
  } catch (error) {
    console.error('Error fetching athlete contests:', error);
    return [];
  }
}

/** Build a lowercase-email → userId map from all user profiles (used for sheet joins). */
// async function buildEmailToUserIdMap(): Promise<Map<string, string>> {
//   const profiles = await getAllUserProfiles();
//   const map = new Map<string, string>();
//   for (const p of profiles) {
//     const email = (p.email as string | undefined)?.toLowerCase().trim();
//     const userId = p.userId as string | undefined;
//     if (email && userId) map.set(email, userId);
//   }
//   return map;
// }

export async function getWorldRecords(): Promise<WorldRecord[]> {
  const cacheKey = `world-records`;
  const cached = cache.get<WorldRecord[]>(cacheKey);
  if (cached) return cached;

  try {
    const [items, emailToUserId = new Map<string, string>()] = await Promise.all([
      getWorldRecordsSheet(),
      // buildEmailToUserIdMap(),
    ]);

    if (!items || items.length === 0) return [];

    const records: WorldRecord[] = items.map(item => ({
      ...item,
      athleteUserId: item.athleteEmail ? emailToUserId.get(item.athleteEmail) : undefined,
    }));

    cache.set(cacheKey, records, 86400000); // Cache for 1 day
    return records;
  } catch (error) {
    console.error('Error fetching world records:', error);
    return [];
  }
}

export async function getWorldFirsts(): Promise<WorldFirst[]> {
  const cacheKey = `world-firsts`;
  const cached = cache.get<WorldFirst[]>(cacheKey);
  if (cached) return cached;

  try {
    const [items, emailToUserId = new Map<string, string>()] = await Promise.all([
      getWorldFirstsSheet(),
      // buildEmailToUserIdMap(),
    ]);

    if (!items || items.length === 0) return [];

    const firsts: WorldFirst[] = items.map(item => ({
      ...item,
      athleteUserId: item.athleteEmail ? emailToUserId.get(item.athleteEmail) : undefined,
    }));

    cache.set(cacheKey, firsts, 86400000); // Cache for 1 day
    return firsts;
  } catch (error) {
    console.error('Error fetching world firsts:', error);
    return [];
  }
}

/** Filter world records to those belonging to a specific athlete (by userId). */
export async function getAthleteWorldRecords(athleteId: string): Promise<WorldRecord[]> {
  const all = await getWorldRecords();
  return all.filter(r => r.athleteUserId === athleteId);
}

/** Filter world firsts to those belonging to a specific athlete (by userId). */
export async function getAthleteWorldFirsts(athleteId: string): Promise<WorldFirst[]> {
  const all = await getWorldFirsts();
  return all.filter(r => r.athleteUserId === athleteId);
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