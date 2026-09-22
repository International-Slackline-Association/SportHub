#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { calculatePointsForRank } from '../../utils/points';
import { EVENTS_TABLE, getTableName, USERS_TABLE } from '../dynamodb';
import type {
  AthleteParticipationRecord,
  ContestRecord,
  EventMetadataRecord,
  UserProfileRecord,
} from '../relational-types';

const DISCIPLINE_LOOKUP: Record<string, { name: string; enumValue: number }> = {
  OVERALL: { name: 'All Disciplines', enumValue: 0 },
  TRICKLINE: { name: 'Trickline', enumValue: 1 },
  TRICKLINE_AERIAL: { name: 'Trickline', enumValue: 2 },
  TRICKLINE_JIB_AND_STATIC: { name: 'Trickline Jib & Static', enumValue: 3 },
  TRICKLINE_TRANSFER: { name: 'Trickline Transfer', enumValue: 4 },
  FREESTYLE_HIGHLINE: { name: 'Freestyle Highline', enumValue: 5 },
  SPEED: { name: 'Speed', enumValue: 6 },
  SPEED_SHORT: { name: 'Speedline Short', enumValue: 7 },
  SPEED_HIGHLINE: { name: 'Speed Highline', enumValue: 8 },
  ENDURANCE: { name: 'Endurance', enumValue: 9 },
  BLIND: { name: 'Blind', enumValue: 10 },
  RIGGING: { name: 'Rigging', enumValue: 11 },
  FREESTYLE: { name: 'Freestyle', enumValue: 12 },
  WALKING: { name: 'Walking', enumValue: 13 },
  '0': { name: 'All Disciplines', enumValue: 0 },
  '1': { name: 'Trickline', enumValue: 1 },
  '2': { name: 'Trickline', enumValue: 2 },
  '3': { name: 'Trickline Jib & Static', enumValue: 3 },
  '4': { name: 'Trickline Transfer', enumValue: 4 },
  '5': { name: 'Freestyle Highline', enumValue: 5 },
  '6': { name: 'Speed', enumValue: 6 },
  '7': { name: 'Speedline Short', enumValue: 7 },
  '8': { name: 'Speed Highline', enumValue: 8 },
  '9': { name: 'Endurance', enumValue: 9 },
  '10': { name: 'Blind', enumValue: 10 },
  '11': { name: 'Rigging', enumValue: 11 },
  '12': { name: 'Freestyle', enumValue: 12 },
  '13': { name: 'Walking', enumValue: 13 },
};

const GENDER_LOOKUP: Record<string, { name: string; enumValue: number }> = {
  ALL: { name: 'All', enumValue: 0 },
  MEN: { name: 'Men', enumValue: 1 },
  WOMEN: { name: 'Women', enumValue: 2 },
  MEN_ONLY: { name: 'Men', enumValue: 1 },
  WOMEN_ONLY: { name: 'Women', enumValue: 2 },
  OTHER: { name: 'Other', enumValue: 3 },
  '0': { name: 'All', enumValue: 0 },
  '1': { name: 'Men', enumValue: 1 },
  '2': { name: 'Women', enumValue: 2 },
  '3': { name: 'Other', enumValue: 3 },
};

const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');
const VERBOSE = process.argv.includes('--verbose');

if (process.argv[1]?.includes('recalculate-points-to-new-formula') && !DRY_RUN && !EXECUTE) {
  console.error('❌ Error: Must specify either --dry-run or --execute');
  console.log('Usage:');
  console.log('  pnpm tsx src/lib/migrations/recalculate-points-to-new-formula.ts --dry-run');
  console.log('  pnpm tsx src/lib/migrations/recalculate-points-to-new-formula.ts --execute');
  process.exit(1);
}

const isLocal = process.env.DYNAMODB_LOCAL === 'true';
const eventsTable = getTableName(EVENTS_TABLE);
const usersTable = getTableName(USERS_TABLE);

const client = new DynamoDBClient({
  region: process.env.DB_REGION || process.env.AWS_REGION || 'us-east-2',
  maxAttempts: 3,
  ...(isLocal ? {
    endpoint: (process.env.DYNAMODB_ENDPOINT || 'http://127.0.0.1:8000').replace('localhost', '127.0.0.1'),
    credentials: {
      accessKeyId: 'dummy',
      secretAccessKey: 'dummy',
    },
  } : {}),
});

const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

function sanitizePointValue(value: number): number {
  const next = Number.isFinite(value) ? Math.round(value) : 0;
  return Math.max(1, next);
}

function formatDiscipline(value?: string | number): string {
  if (value === undefined || value === null || value === '') {
    return 'Unknown';
  }

  const raw = String(value).trim();
  const direct = DISCIPLINE_LOOKUP[raw] ?? DISCIPLINE_LOOKUP[raw.toUpperCase()];
  if (direct) {
    return `${direct.name} (${direct.enumValue})`;
  }

  const byName = Object.values(DISCIPLINE_LOOKUP).find(entry => entry.name.toLowerCase() === raw.toLowerCase());
  if (byName) {
    return `${byName.name} (${byName.enumValue})`;
  }

  return raw;
}

function formatGender(value?: string | number): string {
  if (value === undefined || value === null || value === '') {
    return 'All (0)';
  }

  const raw = String(value).trim();
  const direct = GENDER_LOOKUP[raw] ?? GENDER_LOOKUP[raw.toUpperCase()];
  if (direct) {
    return `${direct.name} (${direct.enumValue})`;
  }

  const byName = Object.values(GENDER_LOOKUP).find(entry => entry.name.toLowerCase() === raw.toLowerCase());
  if (byName) {
    return `${byName.name} (${byName.enumValue})`;
  }

  return raw;
}

function toEventYear(record: Partial<{ startDate?: string; endDate?: string }>): number {
  const startDate = typeof record.startDate === 'string' ? record.startDate : undefined;
  const endDate = typeof record.endDate === 'string' ? record.endDate : undefined;
  const dateValue = startDate || endDate || '1970-01-01';
  const year = Number(new Date(dateValue).getFullYear());
  return Number.isFinite(year) ? year : 1970;
}

function resolveUserName(userId: string | undefined, fallback: Partial<{ name: string; fullName: string }>, userProfilesByUserId: Map<string, UserProfileRecord>): string {
  if (userId) {
    const profile = userProfilesByUserId.get(userId);
    const profileName = typeof profile?.name === 'string' ? profile.name : undefined;
    const profileFullName = typeof profile?.name === 'string' ? profile.name : undefined;
    if (profileName) return profileName;
    if (profileFullName) return profileFullName;
  }

  const fallbackName = typeof fallback.name === 'string' ? fallback.name : undefined;
  const fallbackFullName = typeof fallback.fullName === 'string' ? fallback.fullName : undefined;
  if (fallbackName) return fallbackName;
  if (fallbackFullName) return fallbackFullName;

  return 'unknown';
}

function isProfileRecord(record: unknown): record is UserProfileRecord {
  return typeof record === 'object' && record !== null && 'sortKey' in record && record.sortKey === 'Profile';
}

function isParticipationRecord(record: unknown): record is AthleteParticipationRecord {
  return typeof record === 'object' && record !== null && 'sortKey' in record
    && typeof record.sortKey === 'string' && record.sortKey.startsWith('Participation:');
}

function isMetadataRecord(record: unknown): record is EventMetadataRecord {
  return typeof record === 'object' && record !== null && 'sortKey' in record && record.sortKey === 'Metadata';
}

function isContestRecord(record: unknown): record is ContestRecord {
  return typeof record === 'object' && record !== null && 'sortKey' in record
    && typeof record.sortKey === 'string' && record.sortKey.startsWith('Contest:');
}

async function scanTable(tableName: string): Promise<Record<string, unknown>[]> {
  const allItems: Record<string, unknown>[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const response = await ddb.send(new ScanCommand({
      TableName: tableName,
      ...(lastEvaluatedKey ? { ExclusiveStartKey: lastEvaluatedKey } : {}),
    }));

    if (response.Items) {
      allItems.push(...response.Items);
    }

    lastEvaluatedKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastEvaluatedKey);

  return allItems;
}

async function writeItem(tableName: string, item: Record<string, unknown>) {
  if (DRY_RUN) {
    return;
  }

  await ddb.send(new PutCommand({
    TableName: tableName,
    Item: item,
  }));
}

function buildCsvRow(values: Array<string | number | null | undefined>) {
  return values
    .map((value) => {
      const raw = value == null ? '' : String(value);
      if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    })
    .join(',');
}

async function main() {
  console.log('🔎 Phase 1/4: Scanning event and user tables...');
  const events = (await scanTable(eventsTable)) as Array<Record<string, unknown>>;
  const users = (await scanTable(usersTable)) as Array<Record<string, unknown>>;

  const eventMetadataById = new Map<string, EventMetadataRecord>();
  const contestRecordsByEventId = new Map<string, ContestRecord[]>();
  const userProfilesByUserId = new Map<string, UserProfileRecord>();
  const userParticipationRecordsByUserId = new Map<string, AthleteParticipationRecord[]>();

  for (const record of users) {
    const userId = typeof record.userId === 'string' ? record.userId : undefined;
    if (!userId) continue;

    if (isProfileRecord(record)) {
      userProfilesByUserId.set(userId, record);
    }

    if (isParticipationRecord(record)) {
      const prev = userParticipationRecordsByUserId.get(userId) ?? [];
      prev.push(record);
      userParticipationRecordsByUserId.set(userId, prev);
    }
  }

  for (const record of events) {
    const eventId = typeof record.eventId === 'string' ? record.eventId : undefined;
    if (!eventId) continue;

    if (isMetadataRecord(record)) {
      eventMetadataById.set(eventId, record);
      continue;
    }

    if (isContestRecord(record)) {
      const prev = contestRecordsByEventId.get(eventId) ?? [];
      prev.push(record);
      contestRecordsByEventId.set(eventId, prev);
    }
  }

  const csvRows: string[] = [
    buildCsvRow([
      'eventId',
      'eventName',
      'year',
      'contestId',
      'gender',
      'contestSize',
      'numContestants',
      'userId',
      'userName',
      'sortKey',
      'ranking',
      'before',
      'after',
      'location',
    ]),
  ];

  const eventSummaries = new Map<string, {
    eventId: string;
    eventName: string;
    year: number;
    contestCount: number;
    matchedParticipationCount: number;
    updatedParticipationCount: number;
    updatedResultCount: number;
    updatedContestCount: number;
    needsUpdate: boolean;
  }>();

  console.log('🧮 Phase 2/4: Recalculating contest and participation points...');

  for (const [eventId, contestRecords] of contestRecordsByEventId.entries()) {
    const matchingContestRecords = contestRecords.filter((record) => {
      const recordEventId = typeof record.eventId === 'string' ? record.eventId : undefined;
      return !recordEventId || recordEventId === eventId;
    });

    const eventMeta = eventMetadataById.get(eventId);
    const eventName = eventMeta?.eventName ?? 'Unknown event';
    const year = eventMeta ? toEventYear(eventMeta) : 1970;
    const contestCount = matchingContestRecords.length;

    const summary = {
      eventId,
      eventName,
      year,
      contestCount,
      matchedParticipationCount: 0,
      updatedParticipationCount: 0,
      updatedResultCount: 0,
      updatedContestCount: 0,
      needsUpdate: false,
    };

    eventSummaries.set(eventId, summary);

    if (VERBOSE) console.log(`📍 Event ${summary.eventName} (${summary.year})`);

    for (const contestRecord of matchingContestRecords) {
      const {
        contestId,
        sortKey: contestSortKey,
        gender: contestGender,
        discipline: contestDiscipline,
        contestSize = "",
        eventId: contestEventId,
        results: contestResults = [],
      } = contestRecord;
      const contestUpdateCount = { results: 0, participations: 0, rankings: 0 };

      if (!contestId || !contestSortKey) continue;

      const contestRecordResultsChanges: Array<Record<string, unknown>> = [];

      // Update contest results included in the event record
      if (contestResults.length > 0) {
        const nextResults = contestResults.map((result) => {
          const rank = Number(result.rank ?? 0);
          const existingPoints = Number(result.isaPoints ?? 0);
          const contestGenderValue = (contestGender || 'MIXED') as ContestGender;
          const genderForPoints = contestGenderValue === 'MEN_ONLY' ? 'MEN' : contestGenderValue === 'WOMEN_ONLY' ? 'WOMEN' : 'ALL';
          const numContestants = contestResults.length;
          const recalculated = sanitizePointValue(calculatePointsForRank(rank, contestSize as ContestType, genderForPoints as Gender, numContestants));

          if (recalculated !== existingPoints) {
            contestRecordResultsChanges.push({
              eventId: contestEventId,
              contestId,
              userName: typeof result.name === 'string' ? result.name : 'unknown',
              sortKey: contestSortKey,
              rank: result.rank ?? 0,
              before: String(existingPoints || 0),
              after: String(recalculated),
              location: 'events.ContestRecord.results',
            });
          }

          return {
            ...result,
            isaPoints: recalculated,
          };
        });

        if (contestRecordResultsChanges.length > 0) {
          summary.needsUpdate = true;
          summary.updatedResultCount += contestRecordResultsChanges.length;
          summary.updatedContestCount += 1;
          contestUpdateCount.results = contestRecordResultsChanges.length;

          for (const change of contestRecordResultsChanges) {
            const userId = typeof change.userId === 'string' ? change.userId : (typeof change.id === 'string' ? change.id : '');
            const userName = typeof change.userName === 'string' ? change.userName : 'unknown';
            const location = typeof change.location === 'string' ? change.location : 'events.ContestRecord.results';

            csvRows.push(
              buildCsvRow([
                eventId,
                eventName,
                year,
                contestId,
                contestGender ?? 'MIXED',
                contestSize,
                contestResults.length,
                userId,
                userName,
                String(change.sortKey ?? contestSortKey ?? ''),
                String(change.rank ?? 0),
                String(change.before ?? 0),
                String(change.after ?? 0),
                location,
              ])
            );
          }
        }

        const eventContestRecord = { ...contestRecord, results: nextResults };
        if (DRY_RUN) {
          // no write
        } else if (contestRecordResultsChanges.length > 0) {
          await writeItem(eventsTable, eventContestRecord as Record<string, unknown>);
        }
      }

      // Update participation records for users who participated in this contest stored separately in the users table 
      const matchingParticipationRecords = users.filter((userItem) => {
        const record = userItem as Record<string, unknown>;
        if (!isParticipationRecord(record)) return false;
        return record.eventId === contestEventId && record.contestId === contestId;
      });

      for (const participationRecord of matchingParticipationRecords) {
        const record = participationRecord as Record<string, unknown>;
        const participationPlace = Number(record.place ?? 0);
        const participationBefore = Number(record.points ? String(record.points).replace(/[^0-9.-]/g, '') || '0' : 0);
        const contestGenderValue = (contestGender || 'MIXED') as ContestGender;
        const genderForPoints = contestGenderValue === 'MEN_ONLY' ? 'MEN' : contestGenderValue === 'WOMEN_ONLY' ? 'WOMEN' : 'ALL';
        const numContestants = matchingParticipationRecords.length;
        const recalculated = sanitizePointValue(calculatePointsForRank(participationPlace || 1, contestSize as ContestType, genderForPoints as Gender, numContestants));

        if (recalculated < 1) {
          continue;
        }

        summary.matchedParticipationCount += 1;

        const participationChanged = participationBefore !== recalculated || String(record.points ?? '') !== String(recalculated);

        if (participationChanged) {
          summary.needsUpdate = true;
          summary.updatedParticipationCount += 1;
          contestUpdateCount.participations += 1;

          const nextRecord = {
            ...record,
            points: String(recalculated),
          };

          if (!DRY_RUN) {
            await writeItem(usersTable, nextRecord as Record<string, unknown>);
          }

          const userId = typeof record.userId === 'string' ? record.userId : 'unknown';
          const userName = resolveUserName(userId === 'unknown' ? undefined : userId, record, userProfilesByUserId);

          csvRows.push(
            buildCsvRow([
              eventId,
              eventName,
              year,
              contestId,
              contestGender ?? 'MIXED',
              contestSize,
              numContestants,
              userId,
              userName,
              String(record.sortKey ?? ''),
              String(record.place ?? ''),
              String(participationBefore || 0),
              String(recalculated),
              'users.AthleteParticipationRecord.points',
            ])
          );
        }
      }

      if (VERBOSE) {
        console.log(
          `   • ${DRY_RUN ? '[DRY-RUN] ' : ''}Contest ${contestId} | ${formatDiscipline(contestDiscipline)} | ${formatGender(contestGender)} | ${contestSize} | participation updates: ${contestUpdateCount.participations}/${matchingParticipationRecords.length}, event result updates: ${contestUpdateCount.results}/${contestResults.length}`
        );
      }
    }

  }

  // Compact summary when not running in verbose mode
  if (!VERBOSE) {
    const summaries = Array.from(eventSummaries.values());
    const totalEvents = summaries.length;
    const eventsUpdated = summaries.filter(s => s.needsUpdate).length;

    const totalContestRecords = summaries.reduce((sum, s) => sum + (s.contestCount || 0), 0);
    const contestsWithResultUpdates = summaries.reduce((sum, s) => sum + (s.updatedContestCount || 0), 0);
    const contestResultRowsUpdated = summaries.reduce((sum, s) => sum + (s.updatedResultCount || 0), 0);

    const totalParticipationRecords = summaries.reduce((sum, s) => sum + (s.matchedParticipationCount || 0), 0);
    const participationResultsUpdated = summaries.reduce((sum, s) => sum + (s.updatedParticipationCount || 0), 0);
    const dryRunPrefix = DRY_RUN ? '[DRY-RUN] Would update ' : 'Updated ';
    console.log(`              ${dryRunPrefix}${eventsUpdated} of ${totalEvents} events`);
    console.log(`              ${dryRunPrefix}${contestsWithResultUpdates} of ${totalContestRecords} contest record results (rows changed: ${contestResultRowsUpdated})`);
    console.log(`              ${dryRunPrefix}${participationResultsUpdated} of ${totalParticipationRecords} participation records`);
  }

  console.log('✅ Phase 2/4: Legacy Ranking:* records ignored; only Participation:* updates are processed.');

  console.log('📝 Phase 3/4: Writing detailed CSV report...');
  const csvPath = resolve(process.cwd(), 'recalculate-points-report.csv');
  await writeFile(csvPath, `${csvRows.join('\n')}\n`, 'utf8');

  console.log(`✅ Phase 3/4: CSV report written to ${csvPath}`);
  console.log(`✅ Phase 4/4: Complete (${DRY_RUN ? 'dry-run' : 'execute'})`);
}

main().catch((error) => {
  console.error('❌ Failed to recalculate points:', error);
  process.exit(1);
});
