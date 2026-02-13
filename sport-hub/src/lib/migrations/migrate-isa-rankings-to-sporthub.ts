#!/usr/bin/env node
/**
 * Migration Script: ISA-Rankings → SportHub Schema
 *
 * This script migrates data directly from the ISA-Rankings DynamoDB table
 * to the new SportHub schema (users + events tables with hierarchical sort keys).
 *
 * Supports both local DynamoDB and AWS production environments.
 *
 * Usage:
 *   pnpm tsx src/lib/migrate-isa-rankings-to-sporthub.ts --dry-run
 *   pnpm tsx src/lib/migrate-isa-rankings-to-sporthub.ts --execute
 *
 * Environment Variables:
 *   DYNAMODB_LOCAL - Set to 'true' to use local DynamoDB (default: AWS)
 *   DYNAMODB_ENDPOINT - Local DynamoDB endpoint (default: http://localhost:8000)
 *   AWS_REGION - AWS region for both source and destination tables (default: eu-central-1)
 *   ISA_RANKINGS_TABLE - Source table name (default: 'ISA-Rankings')
 *   SPORTHUB_USERS_TABLE - Destination users table (default: 'users' for local, 'SportHub-Users' for AWS)
 *   SPORTHUB_EVENTS_TABLE - Destination events table (default: 'events' for local, 'SportHub-Events' for AWS)
 *
 * Features:
 *   - Idempotent: Can be re-run safely - reuses existing athlete IDs, creates new ones only for new athletes
 *   - Generates unique SportHub IDs (SportHubID:xxxxxxxx) for each athlete
 *   - Strips points prefixes ($ 900 -> 900)
 *   - Populates isaUsersId on user profiles from participation data
 *   - Creates hierarchical sort keys for efficient querying
 *   - Stores original ISA-Rankings PK for tracking across runs
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
  BatchWriteCommand,
  ScanCommandInput,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";

// Configuration
const AWS_REGION = process.env.AWS_REGION || 'eu-central-1';
const USE_LOCAL = process.env.DYNAMODB_LOCAL === 'true';
const LOCAL_ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';

// Table names - use local- prefix for local dev, no prefix for production
const ISA_RANKINGS_TABLE = USE_LOCAL ? 'ISA-Rankings' : (process.env.ISA_RANKINGS_TABLE || 'ISA-Rankings');
const ISA_USERS_TABLE = 'isa-users'; // Reference DB (no local- prefix, hosted locally in dev)
const SPORTHUB_USERS_TABLE = USE_LOCAL ? 'local-users' : (process.env.SPORTHUB_USERS_TABLE || 'sporthub-users');
const SPORTHUB_EVENTS_TABLE = USE_LOCAL ? 'local-events' : (process.env.SPORTHUB_EVENTS_TABLE || 'sporthub-events');

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
const clientConfig: {
  region: string;
  maxAttempts: number;
  endpoint?: string;
  credentials?: { accessKeyId: string; secretAccessKey: string };
} = {
  region: AWS_REGION,
  maxAttempts: 3,
};

if (USE_LOCAL) {
  clientConfig.endpoint = LOCAL_ENDPOINT;
  clientConfig.credentials = {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  };
}

const sourceClient = new DynamoDBClient(clientConfig);
const sourceDdb = DynamoDBDocumentClient.from(sourceClient, {
  marshallOptions: { removeUndefinedValues: true }
});

const destClient = new DynamoDBClient(clientConfig);
const destDdb = DynamoDBDocumentClient.from(destClient, {
  marshallOptions: { removeUndefinedValues: true }
});

// Types
interface AthleteProfile {
  userId: string;
  isaUsersId?: string;
  athleteSlug: string;
  isaRankingsPK?: string; // Original PK from ISA-Rankings for idempotency
  email?: string;        // Email for Cognito user matching
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
  gsiSortKey: string; // For discipline-rankings-index GSI
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
  type: string;
  createdAt: number;
}

interface ContestRecord {
  eventId: string;
  sortKey: string; // "Contest:{discipline}:{contestId}"
  contestId: string;
  discipline: string;
  contestDate: string;
  dateSortKey: string; // For date-discipline-index GSI
  contestName: string;
  country: string;
  city?: string;
  category?: number;
  gender?: number;
  prize?: number;
  profileUrl?: string;
  thumbnailUrl?: string;
  infoUrl?: string;
  createdAt: number;
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
 * Validate email - returns false for test/placeholder emails
 */
function isValidEmail(email: string | undefined): boolean {
  if (!email) return false;

  // Basic email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;

  // Filter out test/placeholder emails
  const invalidPatterns = [
    'name@test.com',
    'test@test.com',
    'example@example.com',
    '@test.com',
    '@example.com',
  ];

  const lowerEmail = email.toLowerCase();
  return !invalidPatterns.some(pattern => lowerEmail.includes(pattern) || lowerEmail === pattern);
}

/**
 * Generate random SportHub ID
 * Matches the format from export-from-isa-rankings.ts
 */
function generateSportHubId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `SportHubID:${id}`;
}

/**
 * Strip prefix from points string
 * Converts "$ 900", "# 59", "\" 1" -> "900", "59", "1"
 */
function stripPointsPrefix(points: string): string {
  // Extract numeric value from points string (removes $, #, ", etc.)
  const numericValue = parseFloat(points.replace(/[^0-9.-]/g, '')) || 0;
  return numericValue.toString();
}

/**
 * Pad points for GSI sort key
 * Converts "585" -> "00000585" for consistent sorting
 */
function padPoints(points: string): string {
  const numericValue = parseFloat(points.replace(/[^0-9.-]/g, '')) || 0;
  return Math.abs(Math.round(numericValue)).toString().padStart(8, '0');
}

/**
 * ISA Users lookup result containing both name->id mapping and id->email mapping
 */
interface IsaUsersLookup {
  nameLookup: Map<string, string>;   // normalizedName -> isaUsersId
  emailLookup: Map<string, string>;  // isaUsersId -> email
}

/**
 * Build lookup maps from isa-users table
 * Returns Maps for name->isaUsersId and isaUsersId->email
 */
async function buildIsaUsersLookup(): Promise<IsaUsersLookup> {
  console.log('📚 Building lookup maps from isa-users table...');

  const nameLookup = new Map<string, string>();   // normalizedName -> isaUsersId
  const emailLookup = new Map<string, string>();  // isaUsersId -> email
  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

  do {
    const scanParams: ScanCommandInput = {
      TableName: ISA_USERS_TABLE,
      FilterExpression: 'SK_GSI = :details',
      ExpressionAttributeValues: {
        ':details': 'userDetails'
      },
      ExclusiveStartKey: lastEvaluatedKey
    };

    const response = await sourceDdb.send(new ScanCommand(scanParams));

    if (!response.Items || response.Items.length === 0) {
      break;
    }

    for (const item of response.Items) {
      const name = item.name as string | undefined;
      const surname = item.surname as string | undefined;
      const pk = item.PK as string; // e.g., "user:ISA_XXXXXXXX"
      const gsiSk = item.GSI_SK as string | undefined; // e.g., "email:user@example.com"

      if (pk) {
        // Extract ISA_XXXXXXXX from "user:ISA_XXXXXXXX"
        const isaUsersId = pk.replace(/^user:/, '');

        // Store name -> isaUsersId mapping
        if (name && surname) {
          const normalizedName = `${name} ${surname}`.toLowerCase();
          nameLookup.set(normalizedName, isaUsersId);
        }

        // Store isaUsersId -> email mapping
        if (gsiSk && gsiSk.startsWith('email:')) {
          const email = gsiSk.replace(/^email:/, '');
          emailLookup.set(isaUsersId, email);
        }
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`✅ Built lookup maps: ${nameLookup.size} names, ${emailLookup.size} emails from isa-users table\n`);
  return { nameLookup, emailLookup };
}

/**
 * Step 0: Scan existing SportHub athletes to enable idempotent re-runs
 * Returns Map of ISA-Rankings PK -> existing userId
 */
async function scanExistingAthletes(): Promise<Map<string, string>> {
  console.log('🔍 Scanning existing SportHub athletes for idempotency...');

  const existingAthletes = new Map<string, string>(); // isaRankingsPK -> userId
  let scannedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

  do {
    const scanParams: ScanCommandInput = {
      TableName: SPORTHUB_USERS_TABLE,
      FilterExpression: 'sortKey = :profile AND attribute_exists(isaRankingsPK)',
      ExpressionAttributeValues: {
        ':profile': 'Profile'
      },
      ProjectionExpression: 'userId, isaRankingsPK',
      ExclusiveStartKey: lastEvaluatedKey
    };

    try {
      const response = await destDdb.send(new ScanCommand(scanParams));

      if (response.Items && response.Items.length > 0) {
        for (const item of response.Items) {
          const userId = item.userId as string;
          const isaRankingsPK = item.isaRankingsPK as string;

          if (isaRankingsPK) {
            existingAthletes.set(isaRankingsPK, userId);
            scannedCount++;
          }
        }
      }

      lastEvaluatedKey = response.LastEvaluatedKey;
    } catch (error: unknown) {
      // Table might not exist yet on first run
      if (error instanceof Error && error.name === 'ResourceNotFoundException') {
        console.log('   ℹ️  SportHub users table not found - first run');
        break;
      }
      throw error;
    }
  } while (lastEvaluatedKey);

  if (scannedCount > 0) {
    console.log(`✅ Found ${scannedCount} existing athletes in SportHub`);
  } else {
    console.log('✅ No existing athletes found - fresh migration');
  }

  return existingAthletes;
}

/**
 * Step 1: Scan AthleteDetails from ISA-Rankings
 * Returns Map keyed by userId (unique SportHubID)
 */
async function scanAthleteDetails(
  existingAthletes: Map<string, string>,
  isaUsersLookup: IsaUsersLookup
): Promise<{
  athletes: Map<string, Partial<AthleteProfile>>;
  pkToUserId: Map<string, string>; // Maps original PK to userId
}> {
  console.log('📥 Scanning ISA-Rankings for AthleteDetails...');

  const athletes = new Map<string, Partial<AthleteProfile>>();
  const pkToUserId = new Map<string, string>(); // PK (Athlete:{slug}) -> userId mapping
  const usedUserIds = new Set<string>(); // Track generated IDs to prevent collisions
  let scannedCount = 0;
  let reusedCount = 0;
  let newCount = 0;
  let duplicatePKCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

  do {
    const scanParams: ScanCommandInput = {
      TableName: ISA_RANKINGS_TABLE,
      FilterExpression: 'SK_GSI = :athleteDetails',
      ExpressionAttributeValues: {
        ':athleteDetails': 'AthleteDetails'
      },
      ExclusiveStartKey: lastEvaluatedKey
    };

    const response = await sourceDdb.send(new ScanCommand(scanParams));

    if (!response.Items || response.Items.length === 0) {
      break;
    }

    for (const item of response.Items) {
      const athletePK = item.PK as string; // e.g., "Athlete:daniel"
      const athleteSlug = athletePK.replace('Athlete:', '');

      // Match athlete to isa-users by normalized name
      let isaUsersId = item.isaUsersId as string | undefined;
      if (!isaUsersId) {
        // Try to match by normalized name
        const normalizedFullname = item.normalizedFullname as string | undefined;
        const name = item.name as string | undefined;
        const surname = item.surname as string | undefined;

        // Use normalizedFullname if available, otherwise construct from name + surname
        let normalized = normalizedFullname;
        if (!normalized && name) {
          normalized = surname ? `${name} ${surname}`.toLowerCase() : name.toLowerCase();
        }

        if (normalized) {
          isaUsersId = isaUsersLookup.nameLookup.get(normalized);
        }
      }

      // Get email: prefer isa-users (authoritative), fallback to ISA-Rankings
      // Skip test/invalid emails
      const isaUsersEmail = isaUsersId ? isaUsersLookup.emailLookup.get(isaUsersId) : undefined;
      const isaRankingsEmail = item.email as string | undefined;
      const rawEmail = isaUsersEmail || isaRankingsEmail;
      const email = isValidEmail(rawEmail) ? rawEmail : undefined;

      // Check if athlete already exists in SportHub (idempotency)
      let userId: string;
      if (existingAthletes.has(athletePK)) {
        // REUSE existing userId
        userId = existingAthletes.get(athletePK)!;
        reusedCount++;
      } else {
        // Generate NEW unique SportHub ID (ensure no collisions with existing OR newly generated IDs)
        do {
          userId = generateSportHubId();
        } while (usedUserIds.has(userId) || athletes.has(userId));
        newCount++;
      }

      // Track this userId to prevent future collisions
      usedUserIds.add(userId);

      // Check for duplicate PK (shouldn't happen in DynamoDB)
      if (pkToUserId.has(athletePK)) {
        const existingUserId = pkToUserId.get(athletePK);
        console.warn(`   ⚠️  Duplicate PK found: ${athletePK} (existing: ${existingUserId}, new: ${userId})`);
        duplicatePKCount++;
        continue; // Skip this duplicate
      }

      // Use userId as key (unique), not athleteSlug (can have duplicates)
      athletes.set(userId, {
        userId,
        isaUsersId,
        athleteSlug,
        isaRankingsPK: athletePK, // Store for idempotency on future runs
        email,                    // Email for Cognito user matching
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

      // Map original PK -> userId (handles duplicate slugs correctly)
      pkToUserId.set(athletePK, userId);

      scannedCount++;
      if (scannedCount % 100 === 0) {
        console.log(`   📝 Scanned ${scannedCount} athletes (${reusedCount} existing, ${newCount} new)...`);
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`✅ Found ${athletes.size} athletes`);
  console.log(`   ♻️  Reused ${reusedCount} existing athlete IDs`);
  console.log(`   ✨ Created ${newCount} new athlete IDs`);
  if (duplicatePKCount > 0) {
    console.log(`   ⚠️  Skipped ${duplicatePKCount} duplicate PKs in source data`);
  }
  stats.athletesProcessed = athletes.size;
  return { athletes, pkToUserId };
}

/**
 * Step 2: Scan Rankings from ISA-Rankings
 * NOTE: Rankings need to be linked to athletes after athlete scan completes
 */
async function scanRankings(
  athletes: Map<string, Partial<AthleteProfile>>,
  pkToUserId: Map<string, string>
): Promise<Map<string, AthleteRanking[]>> {
  console.log('📥 Scanning ISA-Rankings for Rankings...');

  const rankingsByAthlete = new Map<string, AthleteRanking[]>();
  let scannedCount = 0;
  let skippedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

  do {
    const scanParams: ScanCommandInput = {
      TableName: ISA_RANKINGS_TABLE,
      FilterExpression: 'begins_with(PK, :athlete) AND begins_with(SK_GSI, :rankings)',
      ExpressionAttributeValues: {
        ':athlete': 'Athlete:',
        ':rankings': 'Rankings:'
      },
      ExclusiveStartKey: lastEvaluatedKey
    };

    const response = await sourceDdb.send(new ScanCommand(scanParams));

    if (!response.Items || response.Items.length === 0) {
      break;
    }

    for (const item of response.Items) {
      const athletePK = item.PK as string; // e.g., "Athlete:daniel"
      const skGsi = item.SK_GSI as string;

      // Parse SK_GSI: Rankings:{type}:{year}:{discipline}:{gender}:{ageCategory}
      const parts = skGsi.split(':');
      if (parts.length !== 6 || parts[0] !== 'Rankings') {
        console.warn(`   ⚠️  Invalid Rankings SK_GSI: ${skGsi}`);
        skippedCount++;
        continue;
      }

      // Look up userId using the original PK (handles duplicate slugs)
      const userId = pkToUserId.get(athletePK);
      if (!userId) {
        console.warn(`   ⚠️  Athlete not found for ranking: ${athletePK}`);
        skippedCount++;
        continue;
      }

      // Get athlete to verify
      const athlete = athletes.get(userId);
      if (!athlete) {
        console.warn(`   ⚠️  Athlete data missing for userId: ${userId}`);
        skippedCount++;
        continue;
      }

      // Extract points from GSI_SK (stored as string)
      let points = '0';
      if (item.GSI_SK && typeof item.GSI_SK === 'string') {
        const pointsStr = item.GSI_SK
          .replace(/^[\"%\\\\]\\s*/, '')
          .trim();
        points = stripPointsPrefix(pointsStr); // Strip prefix ($ 900 -> 900)
      }

      // Create GSI sort key for discipline-rankings-index: paddedPoints#userId
      const paddedPoints = padPoints(points);
      const gsiSortKey = `${paddedPoints}#${athlete.userId}`;

      const sortKey = `Ranking:${parts[1]}:${parts[2]}:${parts[3]}:${parts[4]}:${parts[5]}`;

      const ranking: AthleteRanking = {
        userId,
        sortKey,
        discipline: parts[3],
        points,
        rankingType: parts[1],
        year: parts[2],
        gender: parts[4],
        ageCategory: parts[5],
        gsiSortKey,
        lastUpdatedAt: item.lastUpdatedAt ? Number(item.lastUpdatedAt) : undefined,
      };

      if (!rankingsByAthlete.has(userId)) {
        rankingsByAthlete.set(userId, []);
      }
      rankingsByAthlete.get(userId)!.push(ranking);

      scannedCount++;
      if (scannedCount % 500 === 0) {
        console.log(`   🏆 Scanned ${scannedCount} rankings...`);
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`✅ Found ${scannedCount} rankings for ${rankingsByAthlete.size} athletes`);
  if (skippedCount > 0) {
    console.log(`   ⚠️  Skipped ${skippedCount} rankings (missing athlete data)`);
  }
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
    const queryParams: QueryCommandInput = {
      TableName: ISA_RANKINGS_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'Contests'
      },
      ExclusiveStartKey: lastEvaluatedKey
    };

    const response = await sourceDdb.send(new QueryCommand(queryParams));

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

      // Create GSI sort key for date-discipline-index: contestDate#eventId
      const dateSortKey = `${date}#${eventId}`;

      const contest: ContestRecord = {
        eventId,
        sortKey: `Contest:${discipline}:${contestId}`,
        contestId,
        discipline,
        contestDate: date,
        dateSortKey,
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
        createdAt: Date.now(),
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
  athletes: Map<string, Partial<AthleteProfile>>,
  pkToUserId: Map<string, string>
): Promise<Map<string, AthleteParticipation[]>> {
  console.log('📥 Scanning ISA-Rankings for Participations...');

  const participationsByAthlete = new Map<string, AthleteParticipation[]>();
  let scannedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

  do {
    const scanParams: ScanCommandInput = {
      TableName: ISA_RANKINGS_TABLE,
      FilterExpression: 'begins_with(PK, :athlete) AND begins_with(SK_GSI, :contest)',
      ExpressionAttributeValues: {
        ':athlete': 'Athlete:',
        ':contest': 'Contest:'
      },
      ExclusiveStartKey: lastEvaluatedKey
    };

    const response = await sourceDdb.send(new ScanCommand(scanParams));

    if (!response.Items || response.Items.length === 0) {
      break;
    }

    for (const item of response.Items) {
      const athletePK = item.PK as string; // e.g., "Athlete:daniel"
      const athleteSlug = athletePK.replace('Athlete:', '');
      const contestKey = item.SK_GSI as string;

      // Extract contestId from SK_GSI: "Contest:<discipline>:<contestId>"
      const skParts = contestKey.split(':');
      const contestId = skParts[2];

      const contest = contests.get(contestId);
      if (!contest) {
        console.warn(`   ⚠️  Contest not found for participation: ${contestId}`);
        continue;
      }

      // Look up userId using the original PK (handles duplicate slugs)
      const userId = pkToUserId.get(athletePK);
      if (!userId) {
        console.warn(`   ⚠️  Athlete not found for participation: ${athletePK}`);
        continue;
      }

      // Get athlete to verify and update
      const athlete = athletes.get(userId);
      if (!athlete) {
        console.warn(`   ⚠️  Athlete data missing for userId: ${userId}`);
        continue;
      }

      // Extract points from GSI_SK
      let points = '0';
      if (item.GSI_SK && typeof item.GSI_SK === 'string') {
        points = stripPointsPrefix(item.GSI_SK.trim()); // Strip prefix ($ 900 -> 900)
      }

      const place = Number(item.place) || 0;

      // Populate isaUsersId from participation if athlete doesn't have it
      const isaUsersId = item.isaUsersId as string | undefined;
      if (isaUsersId && !athlete.isaUsersId) {
        athlete.isaUsersId = isaUsersId;
      }

      // Create participation record for users table
      const sortKey = `Participation:${contestId}`;

      const participation: AthleteParticipation = {
        userId,
        sortKey,
        eventId: contest.eventId,
        contestId,
        discipline: contest.discipline,
        place,
        points,
        contestDate: contest.contestDate,
        contestName: contest.contestName,
      };

      if (!participationsByAthlete.has(userId)) {
        participationsByAthlete.set(userId, []);
      }
      participationsByAthlete.get(userId)!.push(participation);

      // Add athlete to contest's athletes array (for denormalization)
      contest.athletes.push({
        userId,
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

  for (const [userId, athlete] of athletes.entries()) {
    const athleteParticipations = participations.get(userId) || [];

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
      type: 'competition',
      createdAt: Date.now(),
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
  const userRecords: Record<string, unknown>[] = [];

  // Collect all user records
  for (const [userId, athlete] of athletes.entries()) {
    // 1. Profile record
    userRecords.push({
      userId,
      sortKey: 'Profile',
      ...athlete,
    });

    // 2. Ranking records
    const athleteRankings = rankings.get(userId) || [];
    for (const ranking of athleteRankings) {
      userRecords.push({ ...ranking });
    }

    // 3. Participation records
    const athleteParticipations = participations.get(userId) || [];
    for (const participation of athleteParticipations) {
      userRecords.push({ ...participation });
    }
  }

  // Collect all event records
  const eventRecords: Record<string, unknown>[] = [];

  for (const event of events.values()) {
    eventRecords.push({ ...event });
  }

  for (const contest of contests.values()) {
    // Sort athletes by place before writing
    contest.athletes.sort((a, b) => Number(a.place) - Number(b.place));
    eventRecords.push({ ...contest });
  }

  // Check for duplicate keys before writing
  console.log(`\n🔍 Checking for duplicate keys in ${userRecords.length} records...`);
  const keyCounts = new Map<string, number>();
  const duplicateKeys: string[] = [];

  for (const record of userRecords) {
    const key = `${record.userId}#${record.sortKey}`;
    const count = (keyCounts.get(key) || 0) + 1;
    keyCounts.set(key, count);

    if (count === 2) {
      // First time seeing this duplicate
      duplicateKeys.push(key);
    }
  }

  if (duplicateKeys.length > 0) {
    console.error(`\n❌ FATAL: Found ${duplicateKeys.length} duplicate keys in userRecords:`);
    duplicateKeys.slice(0, 20).forEach(key => {
      const count = keyCounts.get(key) || 0;
      console.error(`   - ${key} (appears ${count} times)`);
    });
    if (duplicateKeys.length > 20) {
      console.error(`   ... and ${duplicateKeys.length - 20} more`);
    }
    console.error(`\n⚠️  Migration aborted - cannot write duplicate keys to DynamoDB`);
    stats.errors = duplicateKeys.length;
    return; // Exit writeRecords function
  }

  console.log(`✅ No duplicate keys found - proceeding with write`);

  // Batch write user records
  console.log(`\n📤 Writing ${userRecords.length} records to ${SPORTHUB_USERS_TABLE}...`);
  let writtenCount = 0;

  for (let i = 0; i < userRecords.length; i += BATCH_SIZE) {
    const batch = userRecords.slice(i, i + BATCH_SIZE);

    // Debug: Check batch for duplicates before sending
    const batchKeySet = new Set<string>();
    const batchDups: string[] = [];
    for (const record of batch) {
      const key = `${record.userId}#${record.sortKey}`;
      if (batchKeySet.has(key)) {
        batchDups.push(key);
      }
      batchKeySet.add(key);
    }

    if (batchDups.length > 0) {
      console.error(`\n⚠️  DEBUG: Found ${batchDups.length} duplicates in batch BEFORE sending to DynamoDB:`);
      batchDups.forEach(k => console.error(`     - ${k}`));
    }

    try {
      const putRequests = batch.map(item => ({
        PutRequest: { Item: item },
      }));

      console.log(`\n🐛 DEBUG batch ${i / BATCH_SIZE}: ${batch.length} items → ${putRequests.length} PutRequests`);

      // Check for duplicate Items in putRequests
      const requestKeys = putRequests.map(r => `${r.PutRequest.Item.userId}#${r.PutRequest.Item.sortKey}`);
      const requestKeySet = new Set(requestKeys);
      if (requestKeys.length !== requestKeySet.size) {
        console.error(`\n⚠️  FOUND IT! PutRequests array has ${requestKeys.length} items but only ${requestKeySet.size} unique keys!`);
        const dupKeys = requestKeys.filter((key, idx) => requestKeys.indexOf(key) !== idx);
        console.error(`   Duplicate keys in PutRequests:`, dupKeys.slice(0, 5));
      }

      // Dump first 3 items to see their structure
      if (i === 0) {
        console.log(`\n🐛 First 3 Items being sent to DynamoDB:`);
        putRequests.slice(0, 3).forEach((req, idx) => {
          console.log(`   ${idx + 1}. userId="${req.PutRequest.Item.userId}" sortKey="${req.PutRequest.Item.sortKey}"`);
          console.log(`      Keys in Item:`, Object.keys(req.PutRequest.Item).sort());
        });
      }

      const command = new BatchWriteCommand({
        RequestItems: {
          [SPORTHUB_USERS_TABLE]: putRequests,
        },
      });

      await destDdb.send(command);
      writtenCount += batch.length;

      if (writtenCount % 500 === 0) {
        console.log(`   ✍️  Written ${writtenCount} user records...`);
      }
    } catch (error) {
      console.error(`\n❌ FATAL: Error writing batch at index ${i}:`, error);

      // Show ALL records in this batch
      console.error(`\n   Batch contained ${batch.length} records. ALL keys:`);
      const batchKeys = batch.map(r => `${r.userId}#${r.sortKey}`);
      batchKeys.forEach((k, idx) => console.error(`     ${idx + 1}. ${k}`));

      // Check for duplicates within this batch
      const batchKeySet = new Set<string>();
      const batchDuplicates: string[] = [];
      for (const record of batch) {
        const key = `${record.userId}#${record.sortKey}`;
        if (batchKeySet.has(key)) {
          batchDuplicates.push(key);
        } else {
          batchKeySet.add(key);
        }
      }

      if (batchDuplicates.length > 0) {
        console.error(`\n   ⚠️  Found ${batchDuplicates.length} duplicate keys WITHIN this batch:`);
        batchDuplicates.forEach(k => console.error(`     - ${k}`));
      } else {
        console.error(`\n   ⚠️  No duplicates found within this batch - DynamoDB may be detecting cross-batch duplicates`);
      }

      stats.errors++;

      // STOP on first error
      console.error(`\n⚠️  Migration aborted due to error. Fix issues and re-run.`);
      return;
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
      console.error(`\n❌ FATAL: Error writing event batch at index ${i}:`, error);
      console.error(`\n   Batch contained ${batch.length} records`);
      stats.errors++;

      // STOP on first error
      console.error(`\n⚠️  Migration aborted due to error. Fix issues and re-run.`);
      return;
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
  console.log(`Environment: ${USE_LOCAL ? `🏠 Local (${LOCAL_ENDPOINT})` : `☁️  AWS (${AWS_REGION})`}`);
  console.log(`Source: ${ISA_RANKINGS_TABLE}`);
  console.log(`Destination: ${SPORTHUB_USERS_TABLE}, ${SPORTHUB_EVENTS_TABLE}`);
  console.log('');

  try {
    // Step 0: Scan existing athletes for idempotency
    const existingAthletes = await scanExistingAthletes();
    console.log();

    // Step 0.5: Build lookup maps from isa-users for isaUsersId and email matching
    const isaUsersLookup = await buildIsaUsersLookup();
    console.log();

    // Step 1: Scan athletes from ISA-Rankings
    const { athletes, pkToUserId } = await scanAthleteDetails(existingAthletes, isaUsersLookup);
    console.log();

    // Step 2: Scan rankings (needs athletes map to link userId)
    const rankings = await scanRankings(athletes, pkToUserId);
    console.log();

    // Step 3: Scan contests
    const contests = await scanContests();
    console.log();

    // Step 4: Scan participations
    const participations = await scanParticipations(contests, athletes, pkToUserId);
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
    } else {
      console.log('\n♻️  This migration is idempotent - you can re-run it safely to update data');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
