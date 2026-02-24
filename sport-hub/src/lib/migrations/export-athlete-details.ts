#!/usr/bin/env node
/**
 * Export athlete details from ISA-Rankings
 *
 * Extracts ISA-Rankings specific data (profile URLs, rankings) without duplicating
 * data that's already in isa-users (name, email, country, birthdate, etc.)
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use local DynamoDB
const localClient = new DynamoDBClient({
  region: 'us-east-2',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
});

const localDdb = DynamoDBDocumentClient.from(localClient);
const ISA_RANKINGS_TABLE = 'ISA-Rankings';

interface AthleteRanking {
  type: string;              // Parsed from SK_GSI
  year: string;              // Parsed from SK_GSI
  discipline: string;        // Parsed from SK_GSI
  gender: string;            // Parsed from SK_GSI
  ageCategory: string;       // Parsed from SK_GSI
  points: string;            // From GSI_SK (as string)
  lastUpdatedAt?: number;    // Timestamp
}

interface AthleteDetails {
  userId: string;              // SportHubID
  isaUsersId?: string;         // Link to isa-users if matched
  athleteSlug: string;         // For reference
  profileUrl?: string;         // ISA-Rankings specific
  thumbnailUrl?: string;       // ISA-Rankings specific
  infoUrl?: string;            // ISA-Rankings specific
  rankings: AthleteRanking[];
}

/**
 * Generate random SportHub ID (same as export-from-isa-rankings.ts)
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
 * Build athleteSlug -> userId mapping from participations
 */
async function buildSlugToUserIdMap(): Promise<Map<string, { userId: string; isaUsersId?: string }>> {
  console.log('📥 Scanning participations to build slug -> userId mapping...');

  const slugMap = new Map<string, { userId: string; isaUsersId?: string }>();
  let scannedCount = 0;
  let lastEvaluatedKey: ScanCommandInput['ExclusiveStartKey'] = undefined;

  // Load contests file to get existing userIds
  const contestsPath = join(__dirname, '../mocks/contests_with_real_userids.json');
  const contests = JSON.parse(readFileSync(contestsPath, 'utf-8'));

  // Build contestKey -> athletes map
  const contestAthletes = new Map<string, Array<Record<string, unknown>>>();
  for (const contest of contests) {
    const contestKey = `Contest:${contest.discipline}:${contest.contestId}`;
    contestAthletes.set(contestKey, contest.athletes);
  }

  // Scan participations to match slug with userId
  do {
    const commandInput: ScanCommandInput = {
      TableName: ISA_RANKINGS_TABLE,
      FilterExpression: 'begins_with(PK, :athlete) AND begins_with(SK_GSI, :contest)',
      ExpressionAttributeValues: {
        ':athlete': 'Athlete:',
        ':contest': 'Contest:'
      },
      ExclusiveStartKey: lastEvaluatedKey
    };
    const command = new ScanCommand(commandInput);

    const response = await localDdb.send(command);

    if (!response.Items || response.Items.length === 0) {
      break;
    }

    for (const item of response.Items) {
      const athleteSlug = (item.PK as string).replace('Athlete:', '');
      const contestKey = item.SK_GSI as string;

      // Skip if already mapped
      if (slugMap.has(athleteSlug)) {
        continue;
      }

      // Find this athlete in the contests file
      const athletes = contestAthletes.get(contestKey);
      if (athletes && athletes.length > 0) {
        // Match by place
        const place = Number(item.place);
        const matchedAthlete = athletes.find(a => Number(a.place) === place);

        if (matchedAthlete && matchedAthlete.userId) {
          slugMap.set(athleteSlug, {
            userId: matchedAthlete.userId as string,
            isaUsersId: matchedAthlete.isaUsersId as string | undefined,
          });
        }
      }

      scannedCount++;
      if (scannedCount % 500 === 0) {
        console.log(`   📝 Scanned ${scannedCount} participations...`);
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`✅ Built mapping for ${slugMap.size} athletes from participations`);
  return slugMap;
}

/**
 * Scan ISA-Rankings for AthleteDetails records
 */
async function scanAthleteDetails(): Promise<Map<string, Partial<AthleteDetails>>> {
  console.log('📥 Scanning ISA-Rankings for AthleteDetails...');

  const athletes = new Map<string, Partial<AthleteDetails>>();
  let scannedCount = 0;
  let lastEvaluatedKey: ScanCommandInput['ExclusiveStartKey'] = undefined;

  do {
    const commandInput: ScanCommandInput = {
      TableName: ISA_RANKINGS_TABLE,
      FilterExpression: 'SK_GSI = :athleteDetails',
      ExpressionAttributeValues: {
        ':athleteDetails': 'AthleteDetails'
      },
      ExclusiveStartKey: lastEvaluatedKey
    };
    const command = new ScanCommand(commandInput);

    const response = await localDdb.send(command);

    if (!response.Items || response.Items.length === 0) {
      break;
    }

    for (const item of response.Items) {
      const athleteSlug = (item.PK as string).replace('Athlete:', '');

      athletes.set(athleteSlug, {
        athleteSlug,
        profileUrl: item.profileUrl as string | undefined,
        thumbnailUrl: item.thumbnailUrl as string | undefined,
        infoUrl: item.infoUrl as string | undefined,
        rankings: [], // Will be populated later
      });

      scannedCount++;

      if (scannedCount % 100 === 0) {
        console.log(`   📝 Scanned ${scannedCount} athletes...`);
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`✅ Found ${athletes.size} athletes with details`);
  return athletes;
}

/**
 * Scan ISA-Rankings for Rankings records
 */
async function scanRankings(): Promise<Map<string, AthleteRanking[]>> {
  console.log('📥 Scanning ISA-Rankings for Rankings...');

  const rankingsByAthlete = new Map<string, AthleteRanking[]>();
  let scannedCount = 0;
  let lastEvaluatedKey2: ScanCommandInput['ExclusiveStartKey'] = undefined;

  do {
    const commandInput: ScanCommandInput = {
      TableName: ISA_RANKINGS_TABLE,
      FilterExpression: 'begins_with(PK, :athlete) AND begins_with(SK_GSI, :rankings)',
      ExpressionAttributeValues: {
        ':athlete': 'Athlete:',
        ':rankings': 'Rankings:'
      },
      ExclusiveStartKey: lastEvaluatedKey2
    };
    const command = new ScanCommand(commandInput);

    const response = await localDdb.send(command);

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

      // Extract points from GSI_SK as STRING
      let points = '0';
      if (item.GSI_SK && typeof item.GSI_SK === 'string') {
        const pointsStr = item.GSI_SK
          .replace(/^["%\\]\s*/, '')  // Remove prefixes
          .trim();
        points = pointsStr; // Keep as string
      }

      const ranking: AthleteRanking = {
        type: parts[1],
        year: parts[2],
        discipline: parts[3],
        gender: parts[4],
        ageCategory: parts[5],
        points,  // String
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

    lastEvaluatedKey2 = response.LastEvaluatedKey;
  } while (lastEvaluatedKey2);

  console.log(`✅ Found ${scannedCount} total rankings for ${rankingsByAthlete.size} athletes`);
  return rankingsByAthlete;
}

/**
 * Main export function
 */
async function exportAthleteDetails() {
  console.log('🚀 Starting athlete details export...\n');

  try {
    // Build slug -> userId mapping from participations
    const slugToUserId = await buildSlugToUserIdMap();

    // Scan AthleteDetails
    const athletes = await scanAthleteDetails();

    // Scan Rankings
    const rankingsByAthlete = await scanRankings();

    // Merge rankings into athletes
    console.log('🔨 Merging rankings into athlete records...');
    for (const [athleteSlug, rankings] of rankingsByAthlete.entries()) {
      if (athletes.has(athleteSlug)) {
        athletes.get(athleteSlug)!.rankings = rankings;
      } else {
        // Athlete has rankings but no AthleteDetails
        athletes.set(athleteSlug, {
          athleteSlug,
          rankings,
        });
      }
    }

    // Assign userIds and track new IDs
    console.log('🔗 Assigning userIds to athletes...');
    let matchedCount = 0;
    let newIdCount = 0;

    for (const [athleteSlug, athlete] of athletes.entries()) {
      const mapping = slugToUserId.get(athleteSlug);
      if (mapping) {
        athlete.userId = mapping.userId;
        athlete.isaUsersId = mapping.isaUsersId;
        matchedCount++;
      } else {
        // Generate new SportHubID
        athlete.userId = generateSportHubId();
        newIdCount++;
      }
    }

    console.log(`✅ Matched ${matchedCount} athletes, generated ${newIdCount} new IDs`);

    // Convert to array and sort by userId
    const athletesList = Array.from(athletes.values())
      .filter(a => a.userId) // Only include athletes with userId
      .map(a => ({
        userId: a.userId!,
        isaUsersId: a.isaUsersId,
        athleteSlug: a.athleteSlug!,
        profileUrl: a.profileUrl,
        thumbnailUrl: a.thumbnailUrl,
        infoUrl: a.infoUrl,
        rankings: a.rankings || [],
      }))
      .sort((a, b) => a.userId.localeCompare(b.userId));

    // Write to file
    const outputPath = join(__dirname, '../mocks/athlete_details.json');
    writeFileSync(outputPath, JSON.stringify(athletesList, null, 2));

    console.log(`\n✅ Export complete!`);
    console.log(`   📁 Output file: ${outputPath}`);
    console.log(`   👥 Total athletes: ${athletesList.length}`);
    console.log(`   🏆 Athletes with rankings: ${athletesList.filter(a => a.rankings.length > 0).length}`);
    console.log(`   🔗 Athletes with isa-users link: ${athletesList.filter(a => a.isaUsersId).length}`);

    if (newIdCount > 0) {
      console.log(`\n⚠️  Note: ${newIdCount} athletes received new IDs`);
      console.log(`   Consider updating contests_with_real_userids.json if these athletes have participations`);
    }

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportAthleteDetails();
