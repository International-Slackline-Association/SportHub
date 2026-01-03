/**
 * ISA-Rankings Database Service
 *
 * Queries the ISA-Rankings reference database for athlete and contest information.
 * This is the source of truth for athlete identity data.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// ISA-Rankings table configuration
const ISA_RANKINGS_TABLE = process.env.ISA_RANKINGS_TABLE || 'ISA-Rankings';
const ISA_RANKINGS_REGION = process.env.ISA_RANKINGS_REGION || 'eu-central-1';

// Create separate DynamoDB client for ISA-Rankings (different region)
const isaRankingsClient = new DynamoDBClient({
  region: ISA_RANKINGS_REGION,
  maxAttempts: 3,
  requestHandler: {
    httpsAgent: {
      maxSockets: 25,
      keepAlive: true,
      keepAliveMsecs: 1000,
    },
    connectionTimeout: 2000,
    requestTimeout: 5000,
  },
});

const isaRankingsDdb = DynamoDBDocumentClient.from(isaRankingsClient);

/**
 * Athlete identity data from ISA-Rankings
 */
export interface ISAAthleteDetails {
  athleteId: string;           // e.g., "claire-irad"
  name: string;
  surname?: string;
  email?: string;
  country?: string;
  city?: string;
  birthdate?: string;
  gender?: number;             // 0=all, 1=male, 2=female
  profileUrl?: string;
  infoUrl?: string;
  normalizedFullname?: string;
  createdAt?: number;
}

/**
 * Contest data from ISA-Rankings
 */
export interface ISAContest {
  contestId: string;           // Short ID from SK_GSI
  discipline: string;          // Discipline number
  name: string;
  country: string;
  city?: string;
  category?: number;           // 1=local, 2=national, 3=international, 4=continental, 5=masters
  gender?: number;             // 0=all, 1=male, 2=female
  date?: string;               // From LSI
  prize?: number;
  profileUrl?: string;
  thumbnailUrl?: string;
  infoUrl?: string;
  createdAt?: number;
}

/**
 * Athlete participation record
 */
export interface ISAAthleteParticipation {
  athleteId: string;
  contestId: string;
  discipline: string;
  place: number;
  date?: string;               // From LSI
}

/**
 * Raw ISA-Rankings DynamoDB record
 */
interface ISARankingsRecord {
  PK: string;
  SK_GSI: string;
  GSI_SK?: string;
  LSI?: string;
  [key: string]: unknown;
}

/**
 * Get athlete details by athlete ID
 *
 * @param athleteId - Athlete slug (e.g., "claire-irad")
 * @returns Athlete details or null if not found
 */
export async function getISAAthleteDetails(athleteId: string): Promise<ISAAthleteDetails | null> {
  try {
    const pk = athleteId.startsWith('Athlete:') ? athleteId : `Athlete:${athleteId}`;

    const command = new GetCommand({
      TableName: ISA_RANKINGS_TABLE,
      Key: {
        PK: pk,
        SK_GSI: 'AthleteDetails'
      },
    });

    const response = await isaRankingsDdb.send(command);

    if (!response.Item) {
      return null;
    }

    return mapToAthleteDetails(response.Item as ISARankingsRecord);
  } catch (error) {
    console.error('Error fetching ISA athlete details:', error);
    return null;
  }
}

/**
 * Get multiple athlete details by IDs (batch operation)
 *
 * @param athleteIds - Array of athlete slugs
 * @returns Map of athleteId to details
 */
export async function getISAAthletesBatch(
  athleteIds: string[]
): Promise<Map<string, ISAAthleteDetails>> {
  const athletes = new Map<string, ISAAthleteDetails>();

  // TODO: Implement BatchGetItem for better performance
  // For now, fetch sequentially
  await Promise.all(
    athleteIds.map(async (athleteId) => {
      const details = await getISAAthleteDetails(athleteId);
      if (details) {
        athletes.set(athleteId, details);
      }
    })
  );

  return athletes;
}

/**
 * Get contest details by discipline and contest ID
 *
 * @param discipline - Discipline number (e.g., "7")
 * @param contestId - Contest short ID (e.g., "a3637f")
 * @returns Contest details or null if not found
 */
export async function getISAContest(discipline: string, contestId: string): Promise<ISAContest | null> {
  try {
    const command = new GetCommand({
      TableName: ISA_RANKINGS_TABLE,
      Key: {
        PK: 'Contests',
        SK_GSI: `Contest:${discipline}:${contestId}`
      },
    });

    const response = await isaRankingsDdb.send(command);

    if (!response.Item) {
      return null;
    }

    return mapToContest(response.Item as ISARankingsRecord, discipline, contestId);
  } catch (error) {
    console.error('Error fetching ISA contest:', error);
    return null;
  }
}

/**
 * Get athlete's contest participations
 *
 * @param athleteId - Athlete slug (e.g., "claire-irad")
 * @returns Array of participations
 */
export async function getISAAthleteParticipations(athleteId: string): Promise<ISAAthleteParticipation[]> {
  try {
    const pk = athleteId.startsWith('Athlete:') ? athleteId : `Athlete:${athleteId}`;

    const command = new QueryCommand({
      TableName: ISA_RANKINGS_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK_GSI, :contest)',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':contest': 'Contest:'
      },
    });

    const response = await isaRankingsDdb.send(command);

    if (!response.Items || response.Items.length === 0) {
      return [];
    }

    return response.Items.map(item => {
      const record = item as ISARankingsRecord;
      // Parse SK_GSI: "Contest:<discipline>:<contestId>"
      const parts = record.SK_GSI.split(':');
      const discipline = parts[1] || '';
      const contestId = parts[2] || '';

      return {
        athleteId,
        contestId,
        discipline,
        place: Number(record.place) || 0,
        date: record.LSI as string | undefined
      };
    });
  } catch (error) {
    console.error('Error fetching ISA athlete participations:', error);
    return [];
  }
}

/**
 * Map ISA-Rankings record to athlete details
 */
function mapToAthleteDetails(record: ISARankingsRecord): ISAAthleteDetails {
  // Extract athleteId from PK (remove "Athlete:" prefix)
  const athleteId = record.PK.replace(/^Athlete:/, '');

  return {
    athleteId,
    name: record.name as string || '',
    surname: record.surname as string | undefined,
    email: record.email as string | undefined,
    country: record.country as string | undefined,
    city: record.city as string | undefined,
    birthdate: record.birthdate as string | undefined,
    gender: record.gender as number | undefined,
    profileUrl: record.profileUrl as string | undefined,
    infoUrl: record.infoUrl as string | undefined,
    normalizedFullname: record.normalizedFullname as string | undefined,
    createdAt: record.createdAt as number | undefined,
  };
}

/**
 * Map ISA-Rankings record to contest
 */
function mapToContest(record: ISARankingsRecord, discipline: string, contestId: string): ISAContest {
  // Extract date from LSI if available (format: "Contest:YYYY-MM-DD")
  let date: string | undefined;
  if (record.LSI && typeof record.LSI === 'string') {
    const datePart = record.LSI.split(':')[1];
    if (datePart) {
      date = datePart;
    }
  }

  return {
    contestId,
    discipline,
    name: record.name as string || '',
    country: record.country as string || '',
    city: record.city as string | undefined,
    category: record.category as number | undefined,
    gender: record.gender as number | undefined,
    date,
    prize: record.prize as number | undefined,
    profileUrl: record.profileUrl as string | undefined,
    thumbnailUrl: record.thumbnailUrl as string | undefined,
    infoUrl: record.infoUrl as string | undefined,
    createdAt: record.createdAt as number | undefined,
  };
}
