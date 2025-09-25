import { dynamodb } from './dynamodb';

// Table names
const RANKINGS_TABLE = 'rankings';
const CONTESTS_TABLE = 'contests';
const ATHLETES_TABLE = 'athletes';

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
  athleteId: string;
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
 * CACHED: Reduces redundant DB calls
 */
export async function getRankingsData(): Promise<AthleteRanking[]> {
  const cacheKey = 'rankings-data';
  const cached = cache.get<AthleteRanking[]>(cacheKey);
  if (cached) return cached;

  try {
    const items = await dynamodb.scanItems(RANKINGS_TABLE);
    if (!items || items.length === 0) {
      return [];
    }

    const rankings = items
      .map((item): AthleteRanking => ({
        athleteId: item.athleteId || item.id || '',
        name: item.name || '',
        surname: '', // Extract from name if needed
        fullName: item.name || '',
        country: item.country || 'Unknown', // Fallback to 'Unknown' instead of empty
        gender: 'male', // Default, should be stored in DB
        ageCategory: 'Open', // Default, should be stored in DB
        disciplines: ['FREESTYLE_HIGHLINE'], // Default, should be stored in DB
        points: item.totalPoints || 0,
        profileImage: `/static/images/profiles/${(item.name || '').toLowerCase().replace(/\s+/g, '-')}.jpg`,
        contestsParticipated: item.contestsParticipated || 0,
        firstCompetition: item.firstCompetition || '',
        lastCompetition: item.lastCompetition || ''
      }))
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
  contestId: string;
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
    athleteId: string;
    name: string;
    place: string;
    points: number;
  }>;
}

/**
 * Get all contests for events table
 * OPTIMIZED: Single scan instead of N+1 queries + Caching
 */
export async function getContestsData(): Promise<ContestData[]> {
  const cacheKey = 'contests-data';
  const cached = cache.get<ContestData[]>(cacheKey);
  if (cached) return cached;

  try {
    // OPTIMIZATION: Fetch both datasets once, not N times
    const [contestItems, athleteItems] = await Promise.all([
      dynamodb.scanItems(CONTESTS_TABLE),
      dynamodb.scanItems(ATHLETES_TABLE)
    ]);

    if (!contestItems || contestItems.length === 0) {
      return [];
    }

    // OPTIMIZATION: Build athlete lookup map once
    const athletesByContest = new Map<string, typeof athleteItems[0][]>();

    athleteItems?.forEach(athlete => {
      const contestId = athlete.contestId;
      if (!contestId) return;

      if (!athletesByContest.has(contestId)) {
        athletesByContest.set(contestId, []);
      }
      athletesByContest.get(contestId)!.push(athlete);
    });

    // OPTIMIZATION: No more concurrent queries, just map lookups
    const contests: ContestData[] = contestItems.map(contest => {
      const contestAthletes = (athletesByContest.get(contest.contestId) || [])
        .map(athlete => ({
          athleteId: athlete.athleteId || '',
          name: athlete.name || '',
          place: athlete.place || '',
          points: athlete.points || 0
        }))
        .sort((a, b) => parseInt(a.place) - parseInt(b.place));

      return {
        contestId: contest.contestId || '',
        name: contest.name || '',
        date: contest.date || '',
        country: contest.country || '',
        city: contest.city || '',
        discipline: contest.discipline || '',
        prize: contest.prize || 0,
        gender: contest.gender || 0,
        category: contest.category || 0,
        verified: contest.verified || false,
        profileUrl: contest.profileUrl || '',
        thumbnailUrl: contest.thumbnailUrl || '',
        athletes: contestAthletes
      };
    });

    const sortedContests = contests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Cache the results
    cache.set(cacheKey, sortedContests, 180000); // Cache for 3 minutes
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
 */
export async function getAthleteProfile(athleteId: string): Promise<AthleteProfile | null> {
  try {
    const user = await dynamodb.getItem(RANKINGS_TABLE, { 'rankings-dev-key': athleteId });
    if (!user) {
      return null;
    }

    return {
      name: user.name || '',
      country: user.country || '',
      disciplines: ['FREESTYLE_HIGHLINE', 'SPEED_HIGHLINE'], // Default, should be stored in DB
      roles: ['ATHLETE'], // Default, should be stored in DB
      socialMedia: {
        instagram: `https://instagram.com/${user.name?.toLowerCase().replace(/\s+/g, '')}`,
        youtube: `https://youtube.com/${user.name?.toLowerCase().replace(/\s+/g, '')}`
      }
    };
  } catch (error) {
    console.error('Error fetching athlete profile:', error);
    return null;
  }
}

/**
 * Get athlete contests/results by athlete ID
 * OPTIMIZED: Batch queries instead of N+1
 */
export async function getAthleteContests(athleteId: string): Promise<AthleteContest[]> {
  try {
    const athleteResults = await dynamodb.scanItems(ATHLETES_TABLE);
    const userResults = athleteResults?.filter(result => result.athleteId === athleteId) || [];

    if (userResults.length === 0) {
      return [];
    }

    // Fetch all contests at once instead of one by one
    const allContests = await dynamodb.scanItems(CONTESTS_TABLE);
    const contestsMap = new Map();

    allContests?.forEach(contest => {
      if (contest['contests-key']) {
        contestsMap.set(contest['contests-key'], contest);
      }
    });

    // OPTIMIZATION: Build results using map lookup instead of async queries
    const contests: AthleteContest[] = userResults.map(result => {
      const contest = contestsMap.get(result.contestId);

      return {
        rank: parseInt(result.place) || 0,
        eventName: contest?.name || result.contestName || '',
        contest: `${contest?.discipline || ''} - Contest`,
        discipline: contest?.discipline || '',
        points: result.points || 0,
        contestSize: getContestSize(contest?.category || 0),
        dates: formatDate(contest?.date || result.date || '')
      };
    });

    return contests.sort((a, b) => b.points - a.points);
  } catch (error) {
    console.error('Error fetching athlete contests:', error);
    return [];
  }
}

/**
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

function getContestSize(category: number): string {
  switch (category) {
    case 1: return 'Local';
    case 2: return 'National';
    case 3: return 'International';
    case 4: return 'Continental';
    case 5: return 'Masters';
    default: return 'Unknown';
  }
}

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