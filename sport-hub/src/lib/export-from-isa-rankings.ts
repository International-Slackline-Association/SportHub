#!/usr/bin/env node
/**
 * One-time export script to migrate data from ISA-Rankings to seed file
 *
 * This script:
 * 1. Reads all athletes from ISA-Rankings table
 * 2. Matches them with isa-users by email to get real userId (ISA_XXXXXXXX)
 * 3. Reads all contests from ISA-Rankings
 * 4. Creates a new seed JSON file with real userIds
 *
 * After running this, ISA-Rankings table can be deleted.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { getReferenceUserByEmail } from './reference-db-service';
import { writeFileSync } from 'fs';
import { join } from 'path';

// ISA-Rankings table (temporary - will be deleted)
const ISA_RANKINGS_TABLE = process.env.ISA_RANKINGS_TABLE || 'ISA-Rankings';
const ISA_RANKINGS_REGION = process.env.ISA_RANKINGS_REGION || 'eu-central-1';

const isaRankingsClient = new DynamoDBClient({
  region: 'us-east-2',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
});

const isaRankingsDdb = DynamoDBDocumentClient.from(isaRankingsClient);

// Also need reference DB client for name matching
const REFERENCE_TABLE = process.env.REFERENCE_DB_TABLE || 'isa-users';
const REFERENCE_REGION = process.env.REFERENCE_DB_REGION || 'eu-central-1';

const referenceClient = new DynamoDBClient({
  region: 'us-east-2',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
});

const referenceDdb = DynamoDBDocumentClient.from(referenceClient);

interface ISAAthleteDetails {
  athleteSlug: string;         // "claire-irad" (from ISA-Rankings)
  userId: string;              // Generated: "SportHubID:a3f9k2m1"
  isaUsersId?: string;         // Linked isa-users ID if matched: "ISA_FBE8B254"
  name: string;
  surname?: string;
  email?: string;
  normalizedFullname?: string; // For name matching: "claire irad"
  country?: string;
  city?: string;
  birthdate?: string;
  gender?: number;
  profileUrl?: string;
  thumbnailUrl?: string;
  infoUrl?: string;
}

interface ISAContest {
  contestId: string;
  discipline: string;
  name: string;
  country: string;
  city?: string;
  category?: number;
  gender?: number;
  date?: string;
  prize?: number;
  profileUrl?: string;
  thumbnailUrl?: string;
  infoUrl?: string;
  normalizedName?: string;
  createdAt?: string;
}

interface ISAParticipation {
  athleteSlug: string;
  contestKey: string;  // "Contest:<discipline>:<contestId>"
  place: number;
  points?: string;      // Points if stored in ISA-Rankings
  date?: string;
}

interface ExportedContest {
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
    userId: string;          // Generated SportHub ID (REQUIRED)
    isaUsersId?: string;     // Linked isa-users ID (OPTIONAL)
    name: string;
    place: string;
    points: string;
    thumbnailUrl?: string;
    infoUrl?: string;
  }>;
}

/**
 * Generate random SportHub ID
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
 * Check if email looks like a fake test email
 */
function isFakeEmail(email: string): boolean {
  const lowerEmail = email.toLowerCase();
  const fakePatterns = [
    '@test.com',
    '@example.com',
    '@fake.com',
    '@temp.com',
    'test@',
    'fake@',
    'temp@',
    'noemail',
    'no-email',
  ];
  return fakePatterns.some(pattern => lowerEmail.includes(pattern));
}

/**
 * Scan isa-users table and build normalized name → userId map for fallback matching
 */
async function buildNameLookupMap(): Promise<Map<string, string>> {
  console.log('📚 Building name lookup map from isa-users...');

  const nameLookup = new Map<string, string>();

  const command = new ScanCommand({
    TableName: REFERENCE_TABLE,
    FilterExpression: 'SK_GSI = :details',
    ExpressionAttributeValues: {
      ':details': 'userDetails'
    }
  });

  const response = await referenceDdb.send(command);

  if (!response.Items) {
    console.log('⚠️  No users found in isa-users table');
    return nameLookup;
  }

  for (const item of response.Items) {
    const name = item.name as string;
    const surname = item.surname as string;
    const userId = (item.PK as string).replace(/^user:/, ''); // Extract ISA_XXXXXXXX

    if (name && surname) {
      // Normalize: "Claire Irad" → "claire irad"
      const normalizedName = `${name} ${surname}`.toLowerCase();
      nameLookup.set(normalizedName, userId);
    }
  }

  console.log(`✅ Built lookup map with ${nameLookup.size} users`);
  return nameLookup;
}

/**
 * Scan ISA-Rankings for all athlete details
 */
async function scanAthletes(): Promise<Map<string, ISAAthleteDetails>> {
  console.log('📥 Scanning ISA-Rankings for athletes...');

  const athletes = new Map<string, ISAAthleteDetails>();
  let scannedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

  // Paginate through all athlete records
  do {
    const command = new ScanCommand({
      TableName: ISA_RANKINGS_TABLE,
      FilterExpression: 'SK_GSI = :athleteDetails',
      ExpressionAttributeValues: {
        ':athleteDetails': 'AthleteDetails'
      },
      ExclusiveStartKey: lastEvaluatedKey
    });

    const response = await isaRankingsDdb.send(command);

    if (!response.Items || response.Items.length === 0) {
      break;
    }

    for (const item of response.Items) {
      const athleteSlug = (item.PK as string).replace('Athlete:', '');
      const athlete: ISAAthleteDetails = {
        athleteSlug,
        userId: generateSportHubId(),  // Generate random SportHub ID
        // isaUsersId will be set in matchWithISAUsers if match succeeds
        name: item.name as string || '',
        surname: item.surname as string | undefined,
        email: item.email as string | undefined,
        normalizedFullname: item.normalizedFullname as string | undefined,  // For name matching
        country: item.country as string | undefined,
        city: item.city as string | undefined,
        birthdate: item.birthdate as string | undefined,
        gender: item.gender as number | undefined,
        profileUrl: item.profileUrl as string | undefined,
        thumbnailUrl: item.thumbnailUrl as string | undefined,
        infoUrl: item.infoUrl as string | undefined,
      };

      athletes.set(athleteSlug, athlete);
      scannedCount++;

      if (scannedCount % 100 === 0) {
        console.log(`   📝 Scanned ${scannedCount} athletes...`);
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`✅ Found ${athletes.size} athletes`);
  return athletes;
}

/**
 * Match athletes with isa-users using two-step strategy (email → name fallback)
 */
async function matchWithISAUsers(athletes: Map<string, ISAAthleteDetails>): Promise<void> {
  console.log('🔗 Matching athletes with isa-users...');

  // Build name lookup map for fallback matching
  const nameLookup = await buildNameLookupMap();

  let emailMatches = 0;       // Athletes matched by email
  let nameMatches = 0;        // Athletes matched by name (fallback)
  let unlinkedCount = 0;      // Athletes not matched at all

  for (const [slug, athlete] of athletes.entries()) {
    let matched = false;

    // STEP 1: Try email match (if email exists and not fake)
    if (athlete.email && !isFakeEmail(athlete.email)) {
      try {
        const isaUser = await getReferenceUserByEmail(athlete.email);
        if (isaUser) {
          athlete.isaUsersId = isaUser.userId;  // Link to isa-users account
          emailMatches++;
          matched = true;

          if (emailMatches % 20 === 0) {
            console.log(`   📧 Matched ${emailMatches} by email...`);
          }
        }

        // Small delay to avoid overwhelming AWS
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`   ❌ Error matching ${slug} by email:`, error);
      }
    }

    // STEP 2: Try name match (fallback if email didn't work)
    if (!matched && athlete.name) {
      // Use normalizedFullname from AthleteDetails if available, otherwise construct it
      const normalizedName = athlete.normalizedFullname ||
                            (athlete.surname
                              ? `${athlete.name} ${athlete.surname}`.toLowerCase()
                              : athlete.name.toLowerCase());

      const isaUserId = nameLookup.get(normalizedName);
      if (isaUserId) {
        athlete.isaUsersId = isaUserId;  // Link to isa-users account
        nameMatches++;
        matched = true;

        if (nameMatches % 20 === 0) {
          console.log(`   👤 Matched ${nameMatches} by name...`);
        }
      }
    }

    if (!matched) {
      unlinkedCount++;
    }
  }

  const totalLinked = emailMatches + nameMatches;
  console.log(`✅ Linked ${totalLinked} athletes to isa-users accounts`);
  console.log(`   📧 ${emailMatches} matched by email`);
  console.log(`   👤 ${nameMatches} matched by name (fallback)`);
  console.log(`   ⚠️  ${unlinkedCount} athletes not linked`);
  console.log(`   📊 All ${athletes.size} athletes will be exported`);
}

/**
 * Query ISA-Rankings for all contests
 */
async function scanContests(): Promise<Map<string, ISAContest>> {
  console.log('📥 Querying ISA-Rankings for contests...');

  const contests = new Map<string, ISAContest>();
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

    const response = await isaRankingsDdb.send(command);

    if (!response.Items || response.Items.length === 0) {
      break;
    }

    for (const item of response.Items) {
      // SK_GSI format: "Contest:<discipline>:<contestId>"
      const skParts = (item.SK_GSI as string).split(':');
      const discipline = skParts[1] || '';
      const contestId = skParts[2] || '';
      const contestKey = item.SK_GSI as string;

      // Extract date from LSI (format: "Contest:YYYY-MM-DD")
      let date = '';
      if (item.LSI && typeof item.LSI === 'string') {
        const datePart = item.LSI.split(':')[1];
        if (datePart) {
          date = datePart;
        }
      }

      const contest: ISAContest = {
        contestId,
        discipline,
        name: item.name as string || '',
        country: item.country as string || '',
        city: item.city as string | undefined,
        category: item.category as number | undefined,
        gender: item.gender as number | undefined,
        date,
        prize: item.prize as number | undefined,
        profileUrl: item.profileUrl as string | undefined,
        thumbnailUrl: item.thumbnailUrl as string | undefined,
        infoUrl: item.infoUrl as string | undefined,
        normalizedName: item.normalizedName as string | undefined,
        createdAt: item.createdAt ? new Date(Number(item.createdAt) * 1000).toISOString() : undefined,
      };

      contests.set(contestKey, contest);
      scannedCount++;

      if (scannedCount % 50 === 0) {
        console.log(`   🏆 Queried ${scannedCount} contests...`);
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`✅ Found ${contests.size} contests`);
  return contests;
}

/**
 * Get all participations for contests
 */
async function scanParticipations(): Promise<ISAParticipation[]> {
  console.log('📥 Scanning ISA-Rankings for participations...');

  const participations: ISAParticipation[] = [];
  let scannedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

  // Paginate through all participation records
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

    const response = await isaRankingsDdb.send(command);

    if (!response.Items || response.Items.length === 0) {
      break;
    }

    for (const item of response.Items) {
      const athleteSlug = (item.PK as string).replace('Athlete:', '');
      const contestKey = item.SK_GSI as string;

      // Extract date from LSI if available
      let date: string | undefined;
      if (item.LSI && typeof item.LSI === 'string') {
        const datePart = item.LSI.split(':')[1];
        if (datePart) {
          date = datePart;
        }
      }

      // Extract points from GSI_SK (stored as string with various prefixes)
      let points: string | undefined;
      if (item.GSI_SK && typeof item.GSI_SK === 'string') {
        // GSI_SK format examples: "\" 1", "% 1322", or just "1322"
        // Remove common prefixes and extract the number
        const pointsStr = item.GSI_SK
          // .replace(/^["%\\]\s*/, '')  // Remove ", %, or \ followed by optional space
          // .trim();
        // const pointsNum = Number(pointsStr);
        // if (!isNaN(pointsNum)) {
        //   points = pointsNum;
        // }
        points = pointsStr
      }

      participations.push({
        athleteSlug,
        contestKey,
        place: Number(item.place) || 0,
        points,
        date
      });

      scannedCount++;

      if (scannedCount % 500 === 0) {
        console.log(`   👥 Scanned ${scannedCount} participations...`);
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`✅ Found ${participations.length} participations`);
  return participations;
}

/**
 * Build exported contests with real userIds
 */
function buildExportedContests(
  contests: Map<string, ISAContest>,
  participations: ISAParticipation[],
  athletes: Map<string, ISAAthleteDetails>
): ExportedContest[] {
  console.log('🏗️  Building exported contests...');

  const contestsMap = new Map<string, ExportedContest>();

  // Group participations by contest
  const participationsByContest = new Map<string, ISAParticipation[]>();
  for (const participation of participations) {
    if (!participationsByContest.has(participation.contestKey)) {
      participationsByContest.set(participation.contestKey, []);
    }
    participationsByContest.get(participation.contestKey)!.push(participation);
  }

  // Build exported contests
  for (const [contestKey, contest] of contests.entries()) {
    const contestParticipations = participationsByContest.get(contestKey) || [];

    // Skip contests with no participants -- NO: We want these...
    // if (contestParticipations.length === 0) {
    //   continue;
    // }

    const exportedAthletes = contestParticipations
      .map(p => {
        const athlete = athletes.get(p.athleteSlug);

        // Skip if athlete not found
        if (!athlete) {
          console.warn(`   ⚠️  Skipping participation: athlete ${p.athleteSlug} not found`);
          return null;
        }

        const fullName = athlete.surname
          ? `${athlete.name} ${athlete.surname}`
          : athlete.name;

        return {
          userId: athlete.userId,              // Generated SportHub ID (always present)
          isaUsersId: athlete.isaUsersId,      // Linked isa-users ID (optional)
          name: fullName,
          place: p.place.toString(),
          points: p.points || "0",  // Use points from ISA-Rankings, default to 0
          thumbnailUrl: athlete.thumbnailUrl,
        };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .sort((a, b) => Number(a.place) - Number(b.place));

    // Skip contests with no valid athletes -- NO: We want to keep all contests
    // if (exportedAthletes.length === 0) {
    //   continue;
    // }

    const exported: ExportedContest = {
      contestId: contest.contestId,
      discipline: contest.discipline,
      date: contest.date || '',                    // From LSI: "Contest:YYYY-MM-DD"
      name: contest.name,
      prize: contest.prize || 0,                   // Prize amount
      createdAt: contest.createdAt || new Date().toISOString(),  // Unix timestamp -> ISO
      profileUrl: contest.profileUrl,              // Contest image URL
      country: contest.country,
      gender: contest.gender || 0,                 // 0=all, 1=male, 2=female
      city: contest.city || '',
      category: contest.category || 1,             // 1-5 (local to masters)
      normalizedName: contest.normalizedName || contest.name.toLowerCase(),
      thumbnailUrl: contest.thumbnailUrl,          // Contest thumbnail URL
      infoUrl: contest.infoUrl, // Contest info URL
      athletes: exportedAthletes
    };

    contestsMap.set(contest.contestId, exported);
  }

  console.log(`✅ Built ${contestsMap.size} exported contests`);
  return Array.from(contestsMap.values());
}

/**
 * Main export function
 */
async function exportFromISARankings() {
  console.log('🚀 Starting export from ISA-Rankings...\n');

  try {
    // Step 1: Scan all athletes
    const athletes = await scanAthletes();
    console.log();

    // Step 2: Match athletes with isa-users to get real userIds
    await matchWithISAUsers(athletes);
    console.log();

    // Step 3: Scan all contests
    const contests = await scanContests();
    console.log();

    // Step 4: Scan all participations
    const participations = await scanParticipations();
    console.log();

    // Step 5: Build exported contests
    const exportedContests = buildExportedContests(contests, participations, athletes);
    console.log();

    // Step 6: Write to file
    const outputPath = join(process.cwd(), 'src/mocks/contests_with_real_userids.json');
    writeFileSync(outputPath, JSON.stringify(exportedContests, null, 2));

    console.log(`✅ Export complete!`);
    console.log(`   📁 Output file: ${outputPath}`);
    console.log(`   📊 Total contests: ${exportedContests.length}`);
    console.log(`   👥 Total athletes: ${athletes.size}`);
    console.log(`   🏆 Total participations: ${participations.length}`);
    console.log();
    console.log('🗑️  ISA-Rankings table can now be safely deleted');

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

// Run export if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exportFromISARankings().catch(console.error);
}

export { exportFromISARankings };
