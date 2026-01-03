/**
 * Seed Data Transformer - ISA-Rankings to SportHub Schema
 *
 * Transforms athlete_details.json and contests_with_real_userids.json
 * into the new hierarchical schema with composite sort keys.
 */

import athleteDetailsData from '@mocks/athlete_details.json';
import contestsData from '@mocks/contests_with_real_userids.json';
import type {
  UserProfileRecord,
  AthleteRankingRecord,
  AthleteParticipationRecord,
  EventMetadataRecord,
  ContestRecord,
  ContestParticipant
} from './relational-types';

// ============================================================================
// TYPE DEFINITIONS FOR SEED DATA
// ============================================================================

interface AthleteDetails {
  userId: string;
  isaUsersId?: string;
  athleteSlug: string;
  profileUrl?: string;
  thumbnailUrl?: string;
  infoUrl?: string;
  rankings: Array<{
    type: string;
    year: string;
    discipline: string;
    gender: string;
    ageCategory: string;
    points: string;
    lastUpdatedAt?: number;
  }>;
}

interface ContestSeed {
  contestId: string;
  discipline: string;
  date: string;
  name: string;
  prize: number;
  createdAt: string;
  profileUrl?: string;
  country: string;
  gender: number;
  city: string;
  category: number;
  normalizedName: string;
  thumbnailUrl?: string;
  infoUrl?: string;
  athletes: Array<{
    userId: string;
    isaUsersId?: string;
    name: string;
    place: string;
    points: string;
    thumbnailUrl?: string;
  }>;
}

// ============================================================================
// TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Pad points for consistent sorting in GSI
 * Converts "585" -> "00000585", "$ 1000" -> "00001000"
 */
function padPoints(points: string): string {
  // Extract numeric value from points string
  const numericValue = parseFloat(points.replace(/[^0-9.-]/g, '')) || 0;
  // Pad to 8 digits for consistent sorting
  return Math.abs(Math.round(numericValue)).toString().padStart(8, '0');
}

/**
 * Process athlete details to create Profile and Ranking records
 */
function processAthleteDetails(): {
  profiles: Map<string, UserProfileRecord>;
  rankings: AthleteRankingRecord[];
} {
  console.log('📥 Processing athlete details...');

  const profiles = new Map<string, UserProfileRecord>();
  const rankings: AthleteRankingRecord[] = [];

  const athletes = athleteDetailsData as AthleteDetails[];

  for (const athlete of athletes) {
    // Calculate total points from rankings (use first ranking's points as representative)
    let totalPoints = 0;
    if (athlete.rankings && athlete.rankings.length > 0) {
      const firstRanking = athlete.rankings[0];
      totalPoints = parseFloat(firstRanking.points.replace(/[^0-9.-]/g, '')) || 0;
    }

    // Create Profile record
    const profile: UserProfileRecord = {
      userId: athlete.userId,
      sortKey: 'Profile',
      isaUsersId: athlete.isaUsersId,
      athleteSlug: athlete.athleteSlug,
      profileUrl: athlete.profileUrl,
      thumbnailUrl: athlete.thumbnailUrl,
      infoUrl: athlete.infoUrl,
      role: 'user',
      userSubTypes: ['athlete'],
      primarySubType: 'athlete',
      totalPoints: Math.round(totalPoints),
      contestCount: 0,  // Will be updated from participations
      createdAt: Date.now(),
    };

    profiles.set(athlete.userId, profile);

    // Create Ranking records
    for (const ranking of athlete.rankings) {
      const sortKey = `Ranking:${ranking.type}:${ranking.year}:${ranking.discipline}:${ranking.gender}:${ranking.ageCategory}`;

      // Create GSI sort key for discipline-rankings-index: paddedPoints#userId
      const paddedPoints = padPoints(ranking.points);
      const gsiSortKey = `${paddedPoints}#${athlete.userId}`;

      const rankingRecord: AthleteRankingRecord = {
        userId: athlete.userId,
        sortKey,
        discipline: ranking.discipline,
        points: ranking.points,
        rankingType: ranking.type,
        year: ranking.year,
        gender: ranking.gender,
        ageCategory: ranking.ageCategory,
        gsiSortKey,
        lastUpdatedAt: ranking.lastUpdatedAt,
      };

      rankings.push(rankingRecord);
    }
  }

  console.log(`✅ Processed ${profiles.size} athlete profiles`);
  console.log(`✅ Created ${rankings.length} ranking records`);

  return { profiles, rankings };
}

/**
 * Process contests to create Event Metadata, Contest, and Participation records
 */
function processContests(
  profiles: Map<string, UserProfileRecord>
): {
  eventMetadata: EventMetadataRecord[];
  contests: ContestRecord[];
  participations: AthleteParticipationRecord[];
} {
  console.log('📥 Processing contests...');

  const eventMetadata: EventMetadataRecord[] = [];
  const contests: ContestRecord[] = [];
  const participations: AthleteParticipationRecord[] = [];

  const contestsTyped = contestsData as ContestSeed[];

  // Group contests by eventId (we'll use date as eventId grouping)
  const contestsByEvent = new Map<string, ContestSeed[]>();

  for (const contest of contestsTyped) {
    // Use date as event grouping (all contests on same date = same event)
    const eventId = `Event:${contest.date}`;

    if (!contestsByEvent.has(eventId)) {
      contestsByEvent.set(eventId, []);
    }
    contestsByEvent.get(eventId)!.push(contest);
  }

  // Process each event group
  for (const [eventId, eventContests] of contestsByEvent.entries()) {
    const firstContest = eventContests[0];

    // Create Event Metadata record
    const metadata: EventMetadataRecord = {
      eventId,
      sortKey: 'Metadata',
      eventName: `${firstContest.country} - ${firstContest.date}`,
      startDate: firstContest.date,
      endDate: firstContest.date,
      location: firstContest.country,
      country: firstContest.country,
      contestCount: eventContests.length,
      type: 'competition',
      createdAt: Date.now(),
    };

    eventMetadata.push(metadata);

    // Process each contest in the event
    for (const contest of eventContests) {
      // Prepare participants for denormalization
      const athletes: ContestParticipant[] = contest.athletes.map(athlete => ({
        userId: athlete.userId,
        isaUsersId: athlete.isaUsersId,
        name: athlete.name,
        place: athlete.place,
        points: athlete.points,
        thumbnailUrl: athlete.thumbnailUrl,
      }));

      // Sort athletes by place
      athletes.sort((a, b) => Number(a.place) - Number(b.place));

      // Create Contest record with hierarchical sort key
      const sortKey = `Contest:${contest.discipline}:${contest.contestId}`;

      // Create GSI sort key for date-discipline-index: contestDate#eventId
      const dateSortKey = `${contest.date}#${eventId}`;

      const contestRecord: ContestRecord = {
        eventId,
        sortKey,
        contestId: contest.contestId,
        discipline: contest.discipline,
        contestName: contest.name,
        contestDate: contest.date,
        dateSortKey,
        country: contest.country,
        city: contest.city,
        category: contest.category,
        gender: contest.gender,
        prize: contest.prize,
        profileUrl: contest.profileUrl,
        thumbnailUrl: contest.thumbnailUrl,
        infoUrl: contest.infoUrl,
        athletes,
        createdAt: Date.now(),
      };

      contests.push(contestRecord);

      // Create Participation records for each athlete
      for (const athlete of contest.athletes) {
        const participation: AthleteParticipationRecord = {
          userId: athlete.userId,
          sortKey: `Participation:${contest.contestId}`,
          eventId,
          contestId: contest.contestId,
          discipline: contest.discipline,
          place: Number(athlete.place),
          points: athlete.points,
          contestDate: contest.date,
          contestName: contest.name,
        };

        participations.push(participation);

        // Update profile aggregations
        const profile = profiles.get(athlete.userId);
        if (profile) {
          profile.contestCount += 1;

          // Update date range
          if (!profile.firstCompetition || contest.date < profile.firstCompetition) {
            profile.firstCompetition = contest.date;
          }
          if (!profile.lastCompetition || contest.date > profile.lastCompetition) {
            profile.lastCompetition = contest.date;
          }

          // Update total points (sum of participation points)
          const participationPoints = parseFloat(athlete.points.replace(/[^0-9.-]/g, '')) || 0;
          profile.totalPoints += Math.round(participationPoints);
        }
      }
    }
  }

  console.log(`✅ Created ${eventMetadata.length} event metadata records`);
  console.log(`✅ Created ${contests.length} contest records`);
  console.log(`✅ Created ${participations.length} participation records`);

  return { eventMetadata, contests, participations };
}

/**
 * Main transformation function
 */
export function transformSeedData(): {
  userProfiles: UserProfileRecord[];
  athleteRankings: AthleteRankingRecord[];
  athleteParticipations: AthleteParticipationRecord[];
  eventMetadata: EventMetadataRecord[];
  contests: ContestRecord[];
} {
  console.log('🚀 Starting seed data transformation...\n');

  // Step 1: Process athletes -> Profiles + Rankings
  const { profiles, rankings } = processAthleteDetails();
  console.log();

  // Step 2: Process contests -> Events + Contests + Participations
  const { eventMetadata, contests, participations } = processContests(profiles);
  console.log();

  // Step 3: Convert profiles map to array
  const userProfiles = Array.from(profiles.values());

  console.log('✅ Transformation complete!');
  console.log(`\nSummary:`);
  console.log(`  👥 User Profiles: ${userProfiles.length}`);
  console.log(`  🏆 Athlete Rankings: ${rankings.length}`);
  console.log(`  📋 Athlete Participations: ${participations.length}`);
  console.log(`  📅 Event Metadata: ${eventMetadata.length}`);
  console.log(`  🎯 Contests: ${contests.length}`);
  console.log();

  return {
    userProfiles,
    athleteRankings: rankings,
    athleteParticipations: participations,
    eventMetadata,
    contests,
  };
}

/**
 * Get data statistics for validation
 */
export function getDataStats() {
  const data = transformSeedData();

  const disciplines = [...new Set(data.contests.map(c => c.discipline))];
  const countries = [...new Set(data.eventMetadata.map(e => e.country))];
  const dateRange = {
    earliest: data.contests.reduce((min, c) => c.contestDate < min ? c.contestDate : min, data.contests[0]?.contestDate || ''),
    latest: data.contests.reduce((max, c) => c.contestDate > max ? c.contestDate : max, data.contests[0]?.contestDate || ''),
  };

  // Calculate total records that will be written to DynamoDB
  const totalUserRecords = data.userProfiles.length + data.athleteRankings.length + data.athleteParticipations.length;
  const totalEventRecords = data.eventMetadata.length + data.contests.length;

  return {
    // User table records
    userProfiles: data.userProfiles.length,
    athleteRankings: data.athleteRankings.length,
    athleteParticipations: data.athleteParticipations.length,
    totalUserRecords,

    // Event table records
    eventMetadata: data.eventMetadata.length,
    contests: data.contests.length,
    totalEventRecords,

    // Metadata
    disciplines,
    countries,
    dateRange,

    // Validation
    athletesWithRankings: data.athleteRankings.length > 0 ? new Set(data.athleteRankings.map(r => r.userId)).size : 0,
    athletesWithParticipations: data.athleteParticipations.length > 0 ? new Set(data.athleteParticipations.map(p => p.userId)).size : 0,
  };
}
