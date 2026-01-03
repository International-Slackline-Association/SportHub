#!/usr/bin/env node
/**
 * Production Migration Script: ISA-Rankings → SportHub Schema
 *
 * This script migrates data directly from the ISA-Rankings DynamoDB table
 * to the new SportHub schema (users + events tables with hierarchical sort keys).
 *
 * IMPORTANT: This is for production use. For local dev, use seed-data.ts with JSON files.
 *
 * Usage:
 *   pnpm tsx src/lib/migrate-isa-rankings-to-sporthub.ts --dry-run
 *   pnpm tsx src/lib/migrate-isa-rankings-to-sporthub.ts --execute
 *
 * Environment Variables Required:
 *   AWS_REGION - AWS region for both source and destination tables
 *   ISA_RANKINGS_TABLE - Source table name (default: 'ISA-Rankings')
 *   SPORTHUB_USERS_TABLE - Destination users table (default: 'SportHub-Users')
 *   SPORTHUB_EVENTS_TABLE - Destination events table (default: 'SportHub-Events')
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
  BatchWriteCommand,
  PutCommand
} from "@aws-sdk/lib-dynamodb";

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'eu-central-1';
const ISA_RANKINGS_TABLE = process.env.ISA_RANKINGS_TABLE || 'ISA-Rankings';
const SPORTHUB_USERS_TABLE = process.env.SPORTHUB_USERS_TABLE || 'SportHub-Users';
const SPORTHUB_EVENTS_TABLE = process.env.SPORTHUB_EVENTS_TABLE || 'SportHub-Events';

const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');

if (!DRY_RUN && !EXECUTE) {
  console.error('❌ Error: Must specify either --dry-run or --execute');
  console.log('Usage:');
  console.log('  pnpm tsx src/lib/migrate-isa-rankings-to-sporthub.ts --dry-run');
  console.log('  pnpm tsx src/lib/migrate-isa-rankings-to-sporthub.ts --execute');
  process.exit(1);
}

// DynamoDB clients
const sourceClient = new DynamoDBClient({
  region: AWS_REGION,
  maxAttempts: 3,
});
const sourceDdb = DynamoDBDocumentClient.from(sourceClient);

const destClient = new DynamoDBClient({
  region: AWS_REGION,
  maxAttempts: 3,
});
const destDdb = DynamoDBDocumentClient.from(destClient);

// Types
interface AthleteProfile {
  userId: string;
  isaUsersId?: string;
  athleteSlug: string;
  profileUrl?: string;
  thumbnailUrl?: string;
  infoUrl?: string;
  role: string;
  userSubTypes: string[];
  primarySubType: string;
  totalPoints: number;
  contestCount: number;
  createdAt: number;
}

interface AthleteRanking {
  userId: string;
  sortKey: string; // "Ranking:{type}:{year}:{discipline}:{gender}:{ageCategory}"
  discipline: string;
  points: string;
  rankingType: string;
  year: string;
  gender: string;
  ageCategory: string;
  lastUpdatedAt?: number;
}

interface AthleteParticipation {
  userId: string;
  sortKey: string; // "Participation:{contestId}"
  eventId: string;
  contestId: string;
  discipline: string;
  place: number;
  points: string;
  contestDate: string;
  contestName: string;
}

interface EventMetadata {
  eventId: string;
  sortKey: string; // "Metadata"
  eventName: string;
  startDate: string;
  endDate: string;
  location: string;
  country: string;
  contestCount: number;
}

interface ContestRecord {
  eventId: string;
  sortKey: string; // "Contest:{discipline}:{contestId}"
  contestId: string;
  discipline: string;
  contestDate: string;
  contestName: string;
  country: string;
  city?: string;
  category?: number;
  gender?: number;
  prize?: number;
  profileUrl?: string;
  thumbnailUrl?: string;
  infoUrl?: string;
  athletes: Array<{
    userId: string;
    isaUsersId?: string;
    name: string;
    place: string;
    points: string;
  }>;
}

// Statistics
const stats = {
  athletesProcessed: 0,
  rankingsCreated: 0,
  participationsCreated: 0,
  profilesCreated: 0,
  eventsCreated: 0,
  contestsCreated: 0,
  errors: 0,
};

/**
 * Step 1: Scan AthleteDetails from ISA-Rankings
 */
async function scanAthleteDetails(): Promise<Map<string, Partial<AthleteProfile>>> {
  console.log('📥 Scanning ISA-Rankings for AthleteDetails...');

  const athletes = new Map<string, Partial<AthleteProfile>>();
  let scannedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

  do {
    const command = new ScanCommand({
      TableName: ISA_RANKINGS_TABLE,
      FilterExpression: 'SK_GSI = :athleteDetails',
      ExpressionAttributeValues: {
        ':athleteDetails': 'AthleteDetails'
      },
      ExclusiveStartKey: lastEvaluatedKey
    });

    const response = await sourceDdb.send(command);

    if (!response.Items || response.Items.length === 0) {
      break;
    }

    for (const item of response.Items) {
      const athleteSlug = (item.PK as string).replace('Athlete:', '');

      // Extract userId from GSI_SK (format: "SportHubID:xxxxx")
      const userId = item.GSI_SK as string;
      const isaUsersId = item.isaUsersId as string | undefined;

      athletes.set(athleteSlug, {
        userId,
        isaUsersId,
        athleteSlug,
        profileUrl: item.profileUrl as string | undefined,
        thumbnailUrl: item.thumbnailUrl as string | undefined,
        infoUrl: item.infoUrl as string | undefined,
        role: 'user',
        userSubTypes: ['athlete'],
        primarySubType: 'athlete',
        totalPoints: 0, // Will calculate from participations
        contestCount: 0, // Will calculate from participations
        createdAt: Date.now(),
      });

      scannedCount++;
      if (scannedCount % 100 === 0) {
        console.log(`   📝 Scanned ${scannedCount} athletes...`);
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`✅ Found ${athletes.size} athletes`);
  stats.athletesProcessed = athletes.size;
  return athletes;
}

/**
 * Step 2: Scan Rankings from ISA-Rankings
 */
async function scanRankings(): Promise<Map<string, AthleteRanking[]>> {
  console.log('📥 Scanning ISA-Rankings for Rankings...');

  const rankingsByAthlete = new Map<string, AthleteRanking[]>();
  let scannedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

  do {
    const command = new ScanCommand({
      TableName: ISA_RANKINGS_TABLE,
      FilterExpression: 'begins_with(PK, :athlete) AND begins_with(SK_GSI, :rankings)',
      ExpressionAttributeValues: {
        ':athlete': 'Athlete:',
        ':rankings': 'Rankings:'
      },
      ExclusiveStartKey: lastEvaluatedKey
    });

    const response = await sourceDdb.send(command);

    if (!response.Items || response.Items.length === 0) {
      break;
    }

    for (const item of response.Items) {
      const athleteSlug = (item.PK as string).replace('Athlete:', '');
      const skGsi = item.SK_GSI as string;

      // Parse SK_GSI: Rankings:{type}:{year}:{discipline}:{gender}:{ageCategory}
      const parts = skGsi.split(':');
      if (parts.length !== 6 || parts[0] !== 'Rankings') {
        console.warn(`   ⚠️  Invalid Rankings SK_GSI: ${skGsi}`);
        continue;
      }

      // Extract userId from GSI_SK
      const userId = item.userId as string;
      if (!userId) {
        console.warn(`   ⚠️  Missing userId for athlete ${athleteSlug}`);
        continue;
      }

      // Extract points from GSI_SK (stored as string)
      let points = '0';
      if (item.GSI_SK && typeof item.GSI_SK === 'string') {
        const pointsStr = item.GSI_SK
          .replace(/^[\"%\\\\]\\s*/, '')
          .trim();
        points = pointsStr;
      }

      const ranking: AthleteRanking = {
        userId,
        sortKey: `Ranking:${parts[1]}:${parts[2]}:${parts[3]}:${parts[4]}:${parts[5]}`,
        discipline: parts[3],
        points,
        rankingType: parts[1],
        year: parts[2],
        gender: parts[4],
        ageCategory: parts[5],
        lastUpdatedAt: item.lastUpdatedAt ? Number(item.lastUpdatedAt) : undefined,
      };

      if (!rankingsByAthlete.has(athleteSlug)) {
        rankingsByAthlete.set(athleteSlug, []);
      }
      rankingsByAthlete.get(athleteSlug)!.push(ranking);

      scannedCount++;
      if (scannedCount % 500 === 0) {
        console.log(`   🏆 Scanned ${scannedCount} rankings...`);
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`✅ Found ${scannedCount} rankings for ${rankingsByAthlete.size} athletes`);
  stats.rankingsCreated = scannedCount;
  return rankingsByAthlete;
}

/**
 * Step 3: Scan Contests from ISA-Rankings
 */
async function scanContests(): Promise<Map<string, ContestRecord>> {
  console.log('📥 Scanning ISA-Rankings for Contests...');

  const contests = new Map<string, ContestRecord>();
  let scannedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

  do {
    const command = new QueryCommand({
      TableName: ISA_RANKINGS_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'Contests'
      },
      ExclusiveStartKey: lastEvaluatedKey
    });

    const response = await sourceDdb.send(command);

    if (!response.Items || response.Items.length === 0) {
      break;
    }

    for (const item of response.Items) {
      // SK_GSI format: "Contest:<discipline>:<contestId>"
      const skParts = (item.SK_GSI as string).split(':');
      const discipline = skParts[1] || '';
      const contestId = skParts[2] || '';

      // Extract date from LSI (format: "Contest:YYYY-MM-DD")
      let date = '';
      if (item.LSI && typeof item.LSI === 'string') {
        const datePart = item.LSI.split(':')[1];
        if (datePart) {
          date = datePart;
        }
      }

      // Generate eventId from date (group contests by date)
      const eventId = `Event:${date}`;

      const contest: ContestRecord = {
        eventId,
        sortKey: `Contest:${discipline}:${contestId}`,
        contestId,
        discipline,
        contestDate: date,
        contestName: item.name as string || '',
        country: item.country as string || '',
        city: item.city as string | undefined,
        category: item.category as number | undefined,
        gender: item.gender as number | undefined,
        prize: item.prize as number | undefined,
        profileUrl: item.profileUrl as string | undefined,
        thumbnailUrl: item.thumbnailUrl as string | undefined,
        infoUrl: item.infoUrl as string | undefined,
        athletes: [], // Will be populated from participations
      };

      contests.set(contestId, contest);
      scannedCount++;

      if (scannedCount % 50 === 0) {
        console.log(`   🏆 Scanned ${scannedCount} contests...`);
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`✅ Found ${contests.size} contests`);
  stats.contestsCreated = contests.size;
  return contests;
}

/**
 * Step 4: Scan Participations from ISA-Rankings
 */
async function scanParticipations(
  contests: Map<string, ContestRecord>,
  athletes: Map<string, Partial<AthleteProfile>>
): Promise<Map<string, AthleteParticipation[]>> {
  console.log('📥 Scanning ISA-Rankings for Participations...');

  const participationsByAthlete = new Map<string, AthleteParticipation[]>();
  let scannedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

  do {
    const command = new ScanCommand({
      TableName: ISA_RANKINGS_TABLE,
      FilterExpression: 'begins_with(PK, :athlete) AND begins_with(SK_GSI, :contest)',
      ExpressionAttributeValues: {
        ':athlete': 'Athlete:',
        ':contest': 'Contest:'
      },
      ExclusiveStartKey: lastEvaluatedKey
    });

    const response = await sourceDdb.send(command);

    if (!response.Items || response.Items.length === 0) {
      break;
    }

    for (const item of response.Items) {
      const athleteSlug = (item.PK as string).replace('Athlete:', '');
      const contestKey = item.SK_GSI as string;

      // Extract contestId from SK_GSI: "Contest:<discipline>:<contestId>"
      const skParts = contestKey.split(':');
      const contestId = skParts[2];

      const contest = contests.get(contestId);
      if (!contest) {
        console.warn(`   ⚠️  Contest not found for participation: ${contestId}`);
        continue;
      }

      const athlete = athletes.get(athleteSlug);
      if (!athlete || !athlete.userId) {
        console.warn(`   ⚠️  Athlete not found for participation: ${athleteSlug}`);
        continue;
      }

      // Extract points from GSI_SK
      let points = '0';
      if (item.GSI_SK && typeof item.GSI_SK === 'string') {
        points = item.GSI_SK.trim();
      }

      const place = Number(item.place) || 0;

      // Create participation record for users table
      const participation: AthleteParticipation = {
        userId: athlete.userId,
        sortKey: `Participation:${contestId}`,
        eventId: contest.eventId,
        contestId,
        discipline: contest.discipline,
        place,
        points,
        contestDate: contest.contestDate,
        contestName: contest.contestName,
      };

      if (!participationsByAthlete.has(athleteSlug)) {
        participationsByAthlete.set(athleteSlug, []);
      }
      participationsByAthlete.get(athleteSlug)!.push(participation);

      // Add athlete to contest's athletes array (for denormalization)
      contest.athletes.push({
        userId: athlete.userId,
        isaUsersId: athlete.isaUsersId,
        name: athleteSlug, // Will be replaced with actual name from isa-users
        place: place.toString(),
        points,
      });

      scannedCount++;
      if (scannedCount % 500 === 0) {
        console.log(`   👥 Scanned ${scannedCount} participations...`);
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`✅ Found ${scannedCount} participations`);
  stats.participationsCreated = scannedCount;
  return participationsByAthlete;
}

/**
 * Step 5: Calculate aggregations for athletes
 */
function calculateAggregations(
  athletes: Map<string, Partial<AthleteProfile>>,
  participations: Map<string, AthleteParticipation[]>
): void {
  console.log('🔢 Calculating athlete aggregations...');

  for (const [athleteSlug, athlete] of athletes.entries()) {
    const athleteParticipations = participations.get(athleteSlug) || [];

    // Calculate total points (sum of all participation points)
    const totalPoints = athleteParticipations.reduce((sum, p) => {
      const points = parseFloat(p.points.replace(/[^0-9.-]/g, '')) || 0;
      return sum + points;
    }, 0);

    athlete.totalPoints = Math.round(totalPoints);
    athlete.contestCount = athleteParticipations.length;
  }

  console.log('✅ Aggregations calculated');
}

/**
 * Step 6: Create event metadata records from contests
 */
function createEventMetadata(contests: Map<string, ContestRecord>): Map<string, EventMetadata> {
  console.log('🏗️  Creating event metadata records...');

  const events = new Map<string, EventMetadata>();

  // Group contests by eventId (which is based on date)
  const contestsByEvent = new Map<string, ContestRecord[]>();
  for (const contest of contests.values()) {
    if (!contestsByEvent.has(contest.eventId)) {
      contestsByEvent.set(contest.eventId, []);
    }
    contestsByEvent.get(contest.eventId)!.push(contest);
  }

  // Create event metadata for each group
  for (const [eventId, eventContests] of contestsByEvent.entries()) {
    const firstContest = eventContests[0];

    const event: EventMetadata = {
      eventId,
      sortKey: 'Metadata',
      eventName: `${firstContest.country} - ${firstContest.contestDate}`,
      startDate: firstContest.contestDate,
      endDate: firstContest.contestDate,
      location: firstContest.country,
      country: firstContest.country,
      contestCount: eventContests.length,
    };

    events.set(eventId, event);
  }

  console.log(`✅ Created ${events.size} event metadata records`);
  stats.eventsCreated = events.size;
  return events;
}

/**
 * Step 7: Write all records to destination tables
 */
async function writeRecords(
  athletes: Map<string, Partial<AthleteProfile>>,
  rankings: Map<string, AthleteRanking[]>,
  participations: Map<string, AthleteParticipation[]>,
  events: Map<string, EventMetadata>,
  contests: Map<string, ContestRecord>
): Promise<void> {
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No data will be written');
    console.log(`\nWould write to ${SPORTHUB_USERS_TABLE}:`);
    console.log(`  - ${athletes.size} athlete profiles`);
    console.log(`  - ${stats.rankingsCreated} ranking records`);
    console.log(`  - ${stats.participationsCreated} participation records`);
    console.log(`\nWould write to ${SPORTHUB_EVENTS_TABLE}:`);
    console.log(`  - ${events.size} event metadata records`);
    console.log(`  - ${contests.size} contest records`);
    return;
  }

  console.log('💾 Writing records to SportHub tables...');

  const BATCH_SIZE = 25; // DynamoDB batch write limit
  const userRecords: any[] = [];
  const eventRecords: any[] = [];

  // Collect all user records
  for (const [athleteSlug, athlete] of athletes.entries()) {
    // 1. Profile record
    userRecords.push({
      userId: athlete.userId,
      sortKey: 'Profile',
      ...athlete,
    });

    // 2. Ranking records
    const athleteRankings = rankings.get(athleteSlug) || [];
    for (const ranking of athleteRankings) {
      userRecords.push(ranking);
    }

    // 3. Participation records
    const athleteParticipations = participations.get(athleteSlug) || [];
    for (const participation of athleteParticipations) {
      userRecords.push(participation);
    }
  }

  // Collect all event records
  for (const event of events.values()) {
    eventRecords.push(event);
  }

  for (const contest of contests.values()) {
    // Sort athletes by place before writing
    contest.athletes.sort((a, b) => Number(a.place) - Number(b.place));
    eventRecords.push(contest);
  }

  // Batch write user records
  console.log(`\n📤 Writing ${userRecords.length} records to ${SPORTHUB_USERS_TABLE}...`);
  let writtenCount = 0;

  for (let i = 0; i < userRecords.length; i += BATCH_SIZE) {
    const batch = userRecords.slice(i, i + BATCH_SIZE);

    try {
      const command = new BatchWriteCommand({
        RequestItems: {
          [SPORTHUB_USERS_TABLE]: batch.map(item => ({
            PutRequest: { Item: item },
          })),
        },
      });

      await destDdb.send(command);
      writtenCount += batch.length;

      if (writtenCount % 500 === 0) {
        console.log(`   ✍️  Written ${writtenCount} user records...`);
      }
    } catch (error) {
      console.error(`   ❌ Error writing batch at index ${i}:`, error);
      stats.errors++;
    }
  }

  console.log(`✅ Written ${writtenCount} records to ${SPORTHUB_USERS_TABLE}`);
  stats.profilesCreated = athletes.size;

  // Batch write event records
  console.log(`\n📤 Writing ${eventRecords.length} records to ${SPORTHUB_EVENTS_TABLE}...`);
  writtenCount = 0;

  for (let i = 0; i < eventRecords.length; i += BATCH_SIZE) {
    const batch = eventRecords.slice(i, i + BATCH_SIZE);

    try {
      const command = new BatchWriteCommand({
        RequestItems: {
          [SPORTHUB_EVENTS_TABLE]: batch.map(item => ({
            PutRequest: { Item: item },
          })),
        },
      });

      await destDdb.send(command);
      writtenCount += batch.length;

      if (writtenCount % 100 === 0) {
        console.log(`   ✍️  Written ${writtenCount} event records...`);
      }
    } catch (error) {
      console.error(`   ❌ Error writing batch at index ${i}:`, error);
      stats.errors++;
    }
  }

  console.log(`✅ Written ${writtenCount} records to ${SPORTHUB_EVENTS_TABLE}`);
}

/**
 * Main migration function
 */
async function migrate() {
  const startTime = Date.now();

  console.log('🚀 ISA-Rankings → SportHub Migration');
  console.log(`\nMode: ${DRY_RUN ? '🔍 DRY RUN' : '⚡ EXECUTE'}`);
  console.log(`Region: ${AWS_REGION}`);
  console.log(`Source: ${ISA_RANKINGS_TABLE}`);
  console.log(`Destination: ${SPORTHUB_USERS_TABLE}, ${SPORTHUB_EVENTS_TABLE}`);
  console.log('');

  try {
    // Step 1: Scan athletes
    const athletes = await scanAthleteDetails();
    console.log();

    // Step 2: Scan rankings
    const rankings = await scanRankings();
    console.log();

    // Step 3: Scan contests
    const contests = await scanContests();
    console.log();

    // Step 4: Scan participations
    const participations = await scanParticipations(contests, athletes);
    console.log();

    // Step 5: Calculate aggregations
    calculateAggregations(athletes, participations);
    console.log();

    // Step 6: Create event metadata
    const events = createEventMetadata(contests);
    console.log();

    // Step 7: Write records
    await writeRecords(athletes, rankings, participations, events, contests);
    console.log();

    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('✅ Migration Complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   Athletes: ${stats.athletesProcessed}`);
    console.log(`   Profiles: ${stats.profilesCreated}`);
    console.log(`   Rankings: ${stats.rankingsCreated}`);
    console.log(`   Participations: ${stats.participationsCreated}`);
    console.log(`   Events: ${stats.eventsCreated}`);
    console.log(`   Contests: ${stats.contestsCreated}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Duration: ${duration}s`);

    if (DRY_RUN) {
      console.log('\n🔍 This was a dry run. To execute, run with --execute flag');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
