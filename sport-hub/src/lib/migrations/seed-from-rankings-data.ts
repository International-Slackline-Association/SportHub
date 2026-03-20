/**
 * Seed Data Transformer - ISA-Rankings Mock Data → SportHub Schema
 *
 * Reads the reduced rankings seed JSON (200 athletes) and synthesises all
 * records needed to populate the sporthub-users and sporthub-events tables
 * for local development.  No isa-users table is required — isaUsersId is
 * intentionally left blank on every profile.
 */

import seedAthletes from '@mocks/data-exports/rankings-seed-data.json';
import type {
  UserProfileRecord,
  AthleteRankingRecord,
  AthleteParticipationRecord,
  EventMetadataRecord,
  ContestRecord,
} from '../relational-types';

// ============================================================================
// TYPES
// ============================================================================

interface SeedAthlete {
  athleteId: string;
  name: string;
  totalPoints: number;
  contestsParticipated: number;
}

// ============================================================================
// STATIC EVENT DEFINITIONS
// ============================================================================

const EVENTS = [
  { name: 'ISA World Cup Round 1',     country: 'FR', city: 'Lyon',           start: '2024-03-15', end: '2024-03-17', contestSize: 'WORLD_CUP' },
  { name: 'ISA Masters',               country: 'DE', city: 'Munich',         start: '2024-04-08', end: '2024-04-10', contestSize: 'MASTERS' },
  { name: 'ISA World Cup Round 2',     country: 'US', city: 'Denver',         start: '2024-05-20', end: '2024-05-22', contestSize: 'WORLD_CUP' },
  { name: 'ISA Grand Slam',            country: 'BR', city: 'Rio de Janeiro', start: '2024-06-14', end: '2024-06-16', contestSize: 'GRAND_SLAM' },
  { name: 'ISA Challenge Cup',         country: 'CH', city: 'Lausanne',       start: '2024-07-06', end: '2024-07-07', contestSize: 'CHALLENGE' },
  { name: 'ISA World Cup Round 3',     country: 'JP', city: 'Kyoto',          start: '2024-08-12', end: '2024-08-14', contestSize: 'WORLD_CUP' },
  { name: 'ISA Open',                  country: 'AU', city: 'Melbourne',      start: '2024-09-18', end: '2024-09-20', contestSize: 'OPEN' },
  { name: 'ISA World Championships',   country: 'ES', city: 'Barcelona',      start: '2024-10-07', end: '2024-10-12', contestSize: 'WORLD_CHAMPIONSHIP' },
  { name: 'ISA World Cup Final',       country: 'CA', city: 'Vancouver',      start: '2024-11-02', end: '2024-11-04', contestSize: 'WORLD_CUP' },
  { name: 'ISA Season Opener 2025',    country: 'IT', city: 'Lecco',          start: '2025-02-15', end: '2025-02-16', contestSize: 'OPEN' },
] as const;

// Discipline codes matching the existing ISA-Rankings migration system
// and what athlete_details.json uses
const DISCIPLINES = [
  { code: '2',  label: 'Trickline' },
  { code: '12', label: 'Highline' },
] as const;

// ============================================================================
// ID GENERATION
// ============================================================================

/** Generate a deterministic-enough 8-char SportHub ID from an athlete slug. */
function generateSportHubId(slug: string): string {
  // Use a simple, collision-resistant hash of the slug
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0; // Convert to 32-bit int
  }
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  let h = Math.abs(hash);
  for (let i = 0; i < 8; i++) {
    id += chars[h % chars.length];
    h = Math.floor(h / chars.length) || (h * 31 + i + 1);
  }
  return `SportHubID:${id}`;
}

/** Generate a short contest ID from a deterministic seed. */
function generateContestId(eventIdx: number, disciplineCode: string, gender: number): string {
  const seed = `${eventIdx}-${disciplineCode}-${gender}`;
  let hash = 0;
  for (const c of seed) {
    hash = (hash << 5) - hash + c.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 6).padStart(6, '0');
}

/** Generate a unique event ID from a deterministic seed. */
function generateEventId(eventIdx: number): string {
  const seed = `event-${eventIdx}`;
  let hash = 0;
  for (const c of seed) {
    hash = (hash << 5) - hash + c.charCodeAt(0);
    hash |= 0;
  }
  return `Event:${Math.abs(hash).toString(36).slice(0, 6).padStart(6, '0')}`;
}

// ============================================================================
// POINTS HELPERS
// ============================================================================

function padPoints(points: number): string {
  return Math.abs(Math.round(points)).toString().padStart(8, '0');
}

/** Per-contest prize estimate: spread total points evenly across participations. */
function contestPoints(athlete: SeedAthlete): number {
  return Math.max(1, Math.round(athlete.totalPoints / Math.max(1, athlete.contestsParticipated)));
}

// ============================================================================
// ATHLETE DISTRIBUTION
//
// Athletes are split into two gender groups deterministically:
//   index 0-99  → Men   (gender "1")
//   index 100-199 → Women (gender "2")
//
// Each contest selects participants based on their rank and the event index,
// so higher-ranked athletes appear in more contests (realistic for top-tier
// competition).
// ============================================================================

/**
 * Decide whether athlete at `rankIndex` (within their gender group, 0-based)
 * participates in event `eventIdx` (0-9) for discipline index `disciplineIdx`
 * (0 = Trickline, 1 = Highline).
 */
function participates(
  rankIndex: number,  // 0 = highest-ranked in gender group
  eventIdx: number,
  disciplineIdx: number
): boolean {
  if (rankIndex < 15) {
    // Elite tier: appear in every event × every discipline
    return true;
  }
  if (rankIndex < 40) {
    // Upper-mid tier: appear in ~7/10 events per discipline
    return (rankIndex + eventIdx * 3 + disciplineIdx) % 10 < 7;
  }
  if (rankIndex < 70) {
    // Mid tier: appear in ~4/10 events per discipline
    return (rankIndex + eventIdx * 3 + disciplineIdx * 2) % 10 < 4;
  }
  // Lower tier: appear in 1-2 events per discipline
  return (rankIndex * 7 + eventIdx * 13 + disciplineIdx * 5) % 10 < 2;
}

// ============================================================================
// MAIN TRANSFORMATION
// ============================================================================

export function transformRankingsData(): {
  userProfiles: UserProfileRecord[];
  athleteRankings: AthleteRankingRecord[];
  athleteParticipations: AthleteParticipationRecord[];
  eventMetadata: EventMetadataRecord[];
  contests: ContestRecord[];
} {
  console.log('🚀 Starting rankings seed data transformation...\n');

  const athletes = seedAthletes as SeedAthlete[];

  // Split into gender groups (deterministic by index position)
  const menAthletes = athletes.slice(0, 100);   // gender "1"
  const womenAthletes = athletes.slice(100, 200); // gender "2"

  // ── Step 1: User Profiles ────────────────────────────────────────────────

  const userProfiles: UserProfileRecord[] = [];
  const athleteIdToUserId = new Map<string, string>();

  for (const [idx, athlete] of athletes.entries()) {
    const userId = generateSportHubId(athlete.athleteId);
    const gender = idx < 100 ? 'male' : 'female';

    athleteIdToUserId.set(athlete.athleteId, userId);

    userProfiles.push({
      userId,
      sortKey: 'Profile',
      athleteSlug: athlete.athleteId,
      name: athlete.name,
      gender,
      role: 'user',
      userSubTypes: ['athlete'],
      primarySubType: 'athlete',
      totalPoints: athlete.totalPoints,
      contestCount: athlete.contestsParticipated,
      createdAt: Date.now(),
    });
  }

  console.log(`✅ Created ${userProfiles.length} user profiles`);

  // ── Step 2: Athlete Rankings ─────────────────────────────────────────────

  const athleteRankings: AthleteRankingRecord[] = [];

  for (const [idx, athlete] of athletes.entries()) {
    const userId = athleteIdToUserId.get(athlete.athleteId)!;
    const genderCode = idx < 100 ? '1' : '2';

    for (const discipline of DISCIPLINES) {
      for (const year of ['2024', '0'] as const) {
        for (const rankingType of ['1', '2'] as const) {
          const sortKey = `Ranking:${rankingType}:${year}:${discipline.code}:${genderCode}:0`;
          const gsiSortKey = `${padPoints(athlete.totalPoints)}#${userId}`;

          athleteRankings.push({
            userId,
            sortKey,
            discipline: discipline.code,
            points: athlete.totalPoints.toString(),
            rankingType,
            year,
            gender: genderCode,
            ageCategory: '0',
            gsiSortKey,
            lastUpdatedAt: Date.now(),
          });
        }
      }
    }
  }

  console.log(`✅ Created ${athleteRankings.length} ranking records`);

  // ── Step 3: Events, Contests & Participations ────────────────────────────

  const eventMetadata: EventMetadataRecord[] = [];
  const contests: ContestRecord[] = [];
  const athleteParticipations: AthleteParticipationRecord[] = [];

  for (const [eventIdx, eventDef] of EVENTS.entries()) {
    const eventId = generateEventId(eventIdx);
    const contestCount = DISCIPLINES.length * 2; // 2 disciplines × 2 genders

    eventMetadata.push({
      eventId,
      sortKey: 'Metadata',
      eventName: eventDef.name,
      startDate: eventDef.start,
      endDate: eventDef.end,
      city: eventDef.city,
      country: eventDef.country,
      contestCount,
      type: 'competition',
      createdAt: Date.now(),
    });

    for (const [disciplineIdx, discipline] of DISCIPLINES.entries()) {
      for (const [gIdx, { genderCode, genderNum, group }] of ([
        { genderCode: '1', genderNum: 1, group: menAthletes },
        { genderCode: '2', genderNum: 2, group: womenAthletes },
      ] as const).entries()) {
        const contestId = generateContestId(eventIdx, discipline.code, genderNum);

        // Select participants
        const selectedAthletes: { athlete: SeedAthlete; place: number }[] = [];
        for (const [rankIndex, athlete] of group.entries()) {
          if (participates(rankIndex, eventIdx, disciplineIdx)) {
            selectedAthletes.push({ athlete, place: 0 });
          }
        }

        // Assign places (already sorted by totalPoints desc)
        selectedAthletes.forEach((entry, i) => { entry.place = i + 1; });

        const contestDate = eventDef.start; // contest starts on event start date

        const dateSortKey = `${contestDate}#${eventId}`;

        const genderCode = genderNum === 1 ? 'MEN_ONLY' : 'WOMEN_ONLY';
        const participationContestName = `${discipline.label} / ${genderCode} / ALL`;

        contests.push({
          eventId,
          sortKey: `Contest:${discipline.code}:${contestId}`,
          contestId,
          discipline: discipline.code,
          contestDate,
          dateSortKey,
          city: eventDef.city,
          gender: genderCode,
          ageCategory: 'ALL',
          contestSize: eventDef.contestSize,
          results: selectedAthletes.map(({ athlete, place }) => ({
            rank: place,
            id: athleteIdToUserId.get(athlete.athleteId)!,
            name: athlete.name,
            isaPoints: contestPoints(athlete),
            isPending: false,
          })),
          createdAt: Date.now(),
        });

        // Build Participation records for each athlete
        for (const { athlete, place } of selectedAthletes) {
          const userId = athleteIdToUserId.get(athlete.athleteId)!;
          athleteParticipations.push({
            userId,
            sortKey: `Participation:${contestId}`,
            eventId,
            contestId,
            discipline: discipline.code,
            place,
            points: String(contestPoints(athlete)),
            contestDate,
            contestName: participationContestName,
          });
        }
      }
    }
  }

  console.log(`✅ Created ${eventMetadata.length} event metadata records`);
  console.log(`✅ Created ${contests.length} contest records`);
  console.log(`✅ Created ${athleteParticipations.length} participation records`);

  console.log('\n✅ Transformation complete!');
  console.log('\nSummary:');
  console.log(`  👥 User Profiles:          ${userProfiles.length}`);
  console.log(`  🏆 Athlete Rankings:       ${athleteRankings.length}`);
  console.log(`  📋 Athlete Participations: ${athleteParticipations.length}`);
  console.log(`  📅 Event Metadata:         ${eventMetadata.length}`);
  console.log(`  🎯 Contests:               ${contests.length}`);
  console.log();

  return {
    userProfiles,
    athleteRankings,
    athleteParticipations,
    eventMetadata,
    contests,
  };
}

// ============================================================================
// STATS (mirrors getDataStats() in seed-data.ts)
// ============================================================================

export function getRankingsDataStats() {
  // Computed directly from the static definitions — does not invoke transformRankingsData()
  // so importing this function has no side effects and produces no console output.
  const athletes = seedAthletes as SeedAthlete[];
  const athleteCount = athletes.length;                      // 200
  const genderGroups = 2;
  // rankings: each athlete gets 2 disciplines × 2 years × 2 types = 8 records
  const rankingsPerAthlete = DISCIPLINES.length * 2 * 2;
  const athleteRankings = athleteCount * rankingsPerAthlete;

  const eventCount = EVENTS.length;                          // 10
  const contestCount = eventCount * DISCIPLINES.length * genderGroups; // 40

  // Count participations by running just the participates() predicate
  let athleteParticipations = 0;
  for (let rankIndex = 0; rankIndex < athleteCount / genderGroups; rankIndex++) {
    for (let eventIdx = 0; eventIdx < eventCount; eventIdx++) {
      for (let disciplineIdx = 0; disciplineIdx < DISCIPLINES.length; disciplineIdx++) {
        if (participates(rankIndex, eventIdx, disciplineIdx)) athleteParticipations++;
      }
    }
  }
  athleteParticipations *= genderGroups; // same distribution for each gender group

  const disciplines = DISCIPLINES.map((d) => d.code);
  const countries = EVENTS.map((e) => e.country);
  const dateRange = {
    earliest: EVENTS[0].start,
    latest:   EVENTS[EVENTS.length - 1].start,
  };

  const totalUserRecords = athleteCount + athleteRankings + athleteParticipations;
  const totalEventRecords = eventCount + contestCount;

  return {
    userProfiles:           athleteCount,
    athleteRankings,
    athleteParticipations,
    totalUserRecords,
    eventMetadata:          eventCount,
    contests:               contestCount,
    totalEventRecords,
    disciplines,
    countries,
    dateRange,
    athletesWithRankings:        athleteCount,
    athletesWithParticipations:  athleteCount,
  };
}
