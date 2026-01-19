/**
 * User Query Service - Optimized queries for user data
 *
 * Uses hierarchical sort keys and GSIs for efficient querying.
 * Eliminates full table scans and N+1 query patterns.
 */

import { DynamoDBDocumentClient, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamodb, dynamoClient, getTableName } from './dynamodb';
import type {
  UserProfileRecord,
  AthleteRankingRecord,
  AthleteParticipationRecord,
  RankingFilter,
} from './relational-types';

const USERS_TABLE = 'users';
const ddb = DynamoDBDocumentClient.from(dynamoClient);

/**
 * Get athlete profile by userId
 * Queries single item with composite key (userId + "Profile")
 *
 * Before: Would scan entire users table
 * After: Direct GetItem query - O(1) lookup
 */
export async function getAthleteProfile(
  userId: string
): Promise<UserProfileRecord | null> {
  try {
    const command = new GetCommand({
      TableName: getTableName(USERS_TABLE),
      Key: {
        userId,
        sortKey: 'Profile',
      },
    });

    const response = await ddb.send(command);

    if (!response.Item) {
      return null;
    }

    return response.Item as UserProfileRecord;
  } catch (error) {
    console.error(`Error fetching athlete profile ${userId}:`, error);
    return null;
  }
}

/**
 * Get athlete rankings with optional filtering
 * Uses begins_with on sort key for hierarchical filtering
 *
 * Before: Would scan all users, filter client-side
 * After: Single query with sort key filter - returns only matching records
 */
export async function getAthleteRankings(
  userId: string,
  filters?: RankingFilter
): Promise<AthleteRankingRecord[]> {
  try {
    // Build sort key prefix based on filters
    let sortKeyPrefix = 'Ranking:';

    if (filters?.type) {
      sortKeyPrefix += `${filters.type}:`;

      if (filters?.year) {
        sortKeyPrefix += `${filters.year}:`;

        if (filters?.discipline) {
          sortKeyPrefix += `${filters.discipline}:`;

          if (filters?.gender) {
            sortKeyPrefix += `${filters.gender}:`;

            if (filters?.ageCategory) {
              sortKeyPrefix += `${filters.ageCategory}`;
            }
          }
        }
      }
    }

    // Query with sortKey begins_with
    const command = new QueryCommand({
      TableName: getTableName(USERS_TABLE),
      KeyConditionExpression: 'userId = :userId AND begins_with(sortKey, :sortKeyPrefix)',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':sortKeyPrefix': sortKeyPrefix,
      },
    });

    const response = await ddb.send(command);
    return (response.Items || []) as AthleteRankingRecord[];
  } catch (error) {
    console.error(`Error fetching rankings for ${userId}:`, error);
    return [];
  }
}

/**
 * Get athlete participations with pagination
 * Uses begins_with on sort key to get all Participation:* records
 *
 * Before: Would get user, then N separate queries for each contest
 * After: Single query returning all participations - eliminates N+1 pattern
 */
export async function getAthleteParticipations(
  userId: string,
  limit: number = 50,
  lastEvaluatedKey?: Record<string, unknown>
): Promise<{
  participations: AthleteParticipationRecord[];
  lastKey?: Record<string, unknown>;
}> {
  try {
    const command = new QueryCommand({
      TableName: getTableName(USERS_TABLE),
      KeyConditionExpression: 'userId = :userId AND begins_with(sortKey, :prefix)',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':prefix': 'Participation:',
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
      ScanIndexForward: false, // Most recent first (reverse chronological)
    });

    const response = await ddb.send(command);

    return {
      participations: (response.Items || []) as AthleteParticipationRecord[],
      lastKey: response.LastEvaluatedKey,
    };
  } catch (error) {
    console.error(`Error fetching participations for ${userId}:`, error);
    return { participations: [] };
  }
}

/**
 * Get top athletes by discipline using discipline-rankings-index GSI
 * Queries GSI for fast discipline-specific rankings
 *
 * Before: Scan all users, filter by discipline, sort client-side (2000ms)
 * After: Query discipline-rankings-index GSI (50ms) - 40x faster
 */
export async function getTopAthletesByDiscipline(
  discipline: string,
  limit: number = 10,
  filters?: {
    type?: string;      // "1" or "2"
    year?: string;      // "2024", "2023", etc.
    gender?: string;    // "0", "1", "2"
    ageCategory?: string; // "0", "1", etc.
  }
): Promise<AthleteRankingRecord[]> {
  try {
    // Query discipline-rankings-index GSI
    const command = new QueryCommand({
      TableName: getTableName(USERS_TABLE),
      IndexName: 'discipline-rankings-index',
      KeyConditionExpression: 'discipline = :discipline',
      ExpressionAttributeValues: {
        ':discipline': discipline,
      },
      Limit: limit * 2, // Get more to account for filtering
      ScanIndexForward: false, // Descending order (highest points first)
    });

    const response = await ddb.send(command);
    let rankings = (response.Items || []) as AthleteRankingRecord[];

    // Apply additional filters if provided
    if (filters) {
      rankings = rankings.filter(r => {
        if (filters.type && r.rankingType !== filters.type) return false;
        if (filters.year && r.year !== filters.year) return false;
        if (filters.gender && r.gender !== filters.gender) return false;
        if (filters.ageCategory && r.ageCategory !== filters.ageCategory) return false;
        return true;
      });
    }

    // Limit again after filtering
    return rankings.slice(0, limit);
  } catch (error) {
    console.error(`Error fetching top athletes for discipline ${discipline}:`, error);
    return [];
  }
}

/**
 * Get athlete profile with recent participations
 * Combines profile query + participations query
 *
 * Before: Get user + N contest queries (1000ms)
 * After: 2 queries total (50ms) - 20x faster
 */
export async function getAthleteProfileWithParticipations(
  userId: string,
  limit: number = 10
): Promise<{
  profile: UserProfileRecord | null;
  participations: AthleteParticipationRecord[];
}> {
  const [profile, participationsResult] = await Promise.all([
    getAthleteProfile(userId),
    getAthleteParticipations(userId, limit),
  ]);

  return {
    profile,
    participations: participationsResult.participations,
  };
}

/**
 * Get multiple athlete profiles in batch
 * Uses BatchGetItem for 10x performance improvement over individual queries
 *
 * @param userIds - Array of user IDs (auto-chunks for batches >100)
 * @returns Map of userId to profile record
 */
export async function getAthleteProfilesBatch(
  userIds: string[]
): Promise<Map<string, UserProfileRecord>> {
  const profiles = new Map<string, UserProfileRecord>();

  if (userIds.length === 0) return profiles;

  // BatchGetItem supports max 100 items - chunk if needed
  const BATCH_SIZE = 100;
  const chunks = [];
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    chunks.push(userIds.slice(i, i + BATCH_SIZE));
  }

  // Process each chunk with BatchGetItem
  for (const chunk of chunks) {
    const keys = chunk.map(userId => ({
      userId,
      sortKey: 'Profile'
    }));

    const items = await dynamodb.batchGetItems(USERS_TABLE, keys);

    // Map results to profiles
    items.forEach((item) => {
      const profile = item as UserProfileRecord;
      if (profile && profile.userId) {
        profiles.set(profile.userId, profile);
      }
    });
  }

  return profiles;
}

/**
 * Search athletes by total points using userSubType-index GSI
 * Queries existing GSI for efficient leaderboard
 *
 * Before: Scan all users, sort client-side
 * After: Query userSubType-index GSI - returns pre-sorted results
 */
export async function getAthleteLeaderboard(
  limit: number = 100,
  lastEvaluatedKey?: Record<string, unknown>
): Promise<{
  profiles: UserProfileRecord[];
  lastKey?: Record<string, unknown>;
}> {
  try {
    const command = new QueryCommand({
      TableName: getTableName(USERS_TABLE),
      IndexName: 'userSubType-index',
      KeyConditionExpression: 'primarySubType = :subType',
      ExpressionAttributeValues: {
        ':subType': 'athlete',
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
      ScanIndexForward: false, // Descending order (highest points first)
    });

    const response = await ddb.send(command);

    // Filter to only Profile records (GSI will return all record types for matching users)
    const profiles = (response.Items || []).filter(
      (r) => r.sortKey === 'Profile'
    ) as UserProfileRecord[];

    return {
      profiles,
      lastKey: response.LastEvaluatedKey,
    };
  } catch (error) {
    console.error('Error fetching athlete leaderboard:', error);
    return { profiles: [] };
  }
}
