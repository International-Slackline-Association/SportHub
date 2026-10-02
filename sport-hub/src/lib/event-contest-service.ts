/**
 * Event/Contest Service
 *
 * Handles CRUD operations for Event → Contest hierarchy.
 * Events contain multiple contests as child records using composite key (PK + SK).
 */

import { DISCIPLINE_DATA } from '@utils/consts';
import { dynamodb, EVENTS_TABLE, USERS_TABLE } from './dynamodb';
import { auth } from '@lib/auth';
import type {
  EventMetadataRecord,
  ContestRecord,
  PendingScoreEditRecord,
  AthleteParticipationRecord,
} from './relational-types';
import { ContestFormValues, EventFormValues } from 'src/app/events/submit/types';
import { EventStatus } from 'src/app/events/my-events/page';

/********************************************************************************
 * 
 * EVENT FUNCTIONS
 * 
 ********************************************************************************/

export interface AssembledEvent extends EventMetadataRecord { contests: ContestRecord[] };

// Generate unique event ID.
// Legacy events follow format Event:YYYY-MM-DD[:city]
function generateEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create new event (metadata record only)
 */
export async function createEventFromForm(eventForm: EventFormValues, status: EventStatus, contestCount: number): Promise<EventMetadataRecord> {
  // Get current user for audit trail
  const session = await auth();

  // Transform form data to database format
  const eventId = generateEventId();
  const eventMetadataRecord = {
    ...eventForm,
    eventId,
    sortKey: 'Metadata',
    createdAt: new Date().getTime(),
    updatedAt: new Date().getTime(),
    status,
    createdBy: session?.user?.id || '',
    createdByName: session?.user?.name || 'unknown',
    contestCount,
    ...(status === 'pending' && { submittedForApprovalAt: new Date().getTime() }),
  };

  console.log(`Creating event ${eventId} with status=${status} createdBy=${session?.user?.id}`);
  await putEventItem(eventMetadataRecord);

  return eventMetadataRecord;
}

/**
 * Get event metadata
 */
export async function getEvent(eventId: string): Promise<EventMetadataRecord | null> {
  const item = await dynamodb.getItem(EVENTS_TABLE, {
    eventId,
    sortKey: 'Metadata',
  });
  return item as EventMetadataRecord | null;
}

/**
 * Update event metadata
 */
export async function updateEvent(
  eventId: string,
  updates: Partial<Omit<EventMetadataRecord, 'eventId' | 'sortKey' | 'contestCount'>>
): Promise<EventMetadataRecord | null> {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  // Build update expression dynamically
  if (updates.eventName !== undefined) {
    updateExpressions.push('#eventName = :eventName');
    expressionAttributeNames['#eventName'] = 'eventName';
    expressionAttributeValues[':eventName'] = updates.eventName;
  }

  if (updates.startDate !== undefined) {
    updateExpressions.push('#startDate = :startDate');
    expressionAttributeNames['#startDate'] = 'startDate';
    expressionAttributeValues[':startDate'] = updates.startDate;
  }

  if (updates.endDate !== undefined) {
    updateExpressions.push('#endDate = :endDate');
    expressionAttributeNames['#endDate'] = 'endDate';
    expressionAttributeValues[':endDate'] = updates.endDate;
  }

  if (updates.city !== undefined) {
    updateExpressions.push('city = :city');
    expressionAttributeValues[':city'] = updates.city;
  }

  if (updates.country !== undefined) {
    updateExpressions.push('#country = :country');
    expressionAttributeNames['#country'] = 'country';
    expressionAttributeValues[':country'] = updates.country;
  }

  if (updates.type !== undefined) {
    updateExpressions.push('#type = :type');
    expressionAttributeNames['#type'] = 'type';
    expressionAttributeValues[':type'] = updates.type;
  }

  if (updates.organizers !== undefined) {
    updateExpressions.push('#organizers = :organizers');
    expressionAttributeNames['#organizers'] = 'organizers';
    expressionAttributeValues[':organizers'] = updates.organizers;
  }

  if (updateExpressions.length === 0) {
    return await getEvent(eventId);
  }

  const result = await dynamodb.updateItem(
    EVENTS_TABLE,
    { eventId, sortKey: 'Metadata' },
    {
      updateExpression: `SET ${updateExpressions.join(', ')}`,
      expressionAttributeNames,
      expressionAttributeValues,
    }
  );

  return result as EventMetadataRecord;
}

/**
 * Low-level upsert for any events-table record
 *
 * Replaces bare `dynamodb.putItem(EVENTS_TABLE, record)` calls in action files.
 */
export async function putEventItem(record: Record<string, unknown>): Promise<void> {
  await dynamodb.putItem(EVENTS_TABLE, record);
}

/**
 * Get assembled event (metadata + sorted Contest records)
 *
 * Returns `{ ...metadataOnly, contests }` where contests are separate Contest:* records
 */
export async function getAssembledEvent(
  eventId: string
): Promise<{ success: boolean; event: AssembledEvent | null }> {
  try {
    const metadata = await getEvent(eventId);
    if (!metadata) {
      return { success: false, event: null };
    }

    let contests: ContestRecord[] = [];
    const { contests: embeddedContests, ...metadataOnly } = metadata;

    const hasEmbeddedContests = Array.isArray(embeddedContests) && embeddedContests.length > 0;
    // If the event has embedded contests (new format), use those;
    // otherwise, use the separate Contest:* records
    if (hasEmbeddedContests) {
      contests = embeddedContests;
    } else {
      const allContests = await getEventContests(eventId);
      // Legacy migrated events derive eventId from date alone (`Event:YYYY-MM-DD[:city]`),
      // so two distinct events can share a partition — city is used to disambiguate.
      // New-format events (`event-<timestamp>-<rand>`, see generateEventId()) have a
      // collision-proof eventId, so no disambiguation is needed — and their Contest:*
      // records never carry a city field anyway, so filtering on it here would drop
      // every contest.
      const isLegacyEventId = eventId.startsWith('Event:');
      contests = isLegacyEventId
        ? allContests.filter((c) => c.city?.toLowerCase() === metadata.city?.toLowerCase())
        : allContests;
    }

    contests = contests.sort(
      (a, b) => (a.contestIndex || 0) - (b.contestIndex || 0)
    );

    return { success: true, event: { ...metadataOnly, contests } };
  } catch (error) {
    console.error('Error fetching event:', error);
    return { success: false, event: null };
  }
}

/**
 * Scan all items in the events table
 *
 * Replaces bare `dynamodb.scanItems(EVENTS_TABLE)` calls in action files.
 */
export async function scanAllEventItems(
  options?: Parameters<typeof dynamodb.scanItems>[1]
): Promise<EventMetadataRecord[]> {
  return (await dynamodb.scanItems(EVENTS_TABLE, options)) || [];
}

/**
 * Delete event and all its contests
 */
export async function deleteEvent(eventId: string): Promise<boolean> {
  try {
    // Get all records for this event (metadata + contests)
    const allItems = await dynamodb.queryItems(
      EVENTS_TABLE,
      'eventId = :eventId',
      { ':eventId': eventId }
    );

    // Delete all records
    for (const item of allItems) {
      await dynamodb.deleteItem(EVENTS_TABLE, {
        eventId: item.eventId,
        sortKey: item.sortKey,
      });
    }

    return true;
  } catch (error) {
    console.error(`Error deleting event ${eventId}:`, error);
    return false;
  }
}

/********************************************************************************
 * 
 * CONTEST FUNCTIONS
 * 
 ********************************************************************************/

export function generateContestId() {
  return Math.random().toString(36).slice(2, 8); // 6 random alpha-numeric characters
}

/**
 * Create contest associated with an event
 */
export async function createContestFromForm(
  eventId: string, 
  contestForm: ContestFormValues, 
  contestIndex: number, 
  updateContestCount: boolean = false
): Promise<ContestRecord> {
  const { contestId, discipline, startDate, endDate, results = [] } = contestForm;

  let disciplineEnumValue: string = discipline;
  if (Number.isNaN(Number(disciplineEnumValue))) {
    disciplineEnumValue = String(DISCIPLINE_DATA[discipline]?.enumValue);
  }

  const contestDate = endDate || startDate || '';
  const contestRecord = {
    ...contestForm,
    eventId,
    sortKey: `Contest:${disciplineEnumValue}:${contestId}`,
    contestId,
    contestIndex,
    contestDate,
    dateSortKey: `${contestDate}#${eventId}`,
    discipline: disciplineEnumValue,
    results,
  };

  console.log(`Creating contest ${contestId} for event ${eventId}`);

  await dynamodb.putItem(EVENTS_TABLE, contestRecord);
  await syncContestParticipationRecords(eventId, contestRecord);

  if (updateContestCount) {
    await dynamodb.updateItem(
      EVENTS_TABLE,
      { eventId, sortKey: 'Metadata' },
      {
        updateExpression: 'SET contestCount = contestCount + :one',
        expressionAttributeValues: { ':one': 1 },
      }
    );
  }

  return contestRecord;
}

/**
 * Delete one Contest:* record and all linked Participation:* records.
 */
export async function deleteContestAndParticipationRecords(
  eventId: string,
  contestId: string,
  contestSortKey: string
): Promise<void> {
  await dynamodb.deleteItem(EVENTS_TABLE, { eventId, sortKey: contestSortKey });

  const participationRecords = await getParticipationRecords(eventId, contestId);
  await Promise.all(
    participationRecords.map(({ userId, sortKey }) =>
      dynamodb.deleteItem(USERS_TABLE, { userId, sortKey })
    )
  );
}

/**
 * Get all contests for an event
 */
export async function getEventContests(eventId: string): Promise<ContestRecord[]> {
  const items = await dynamodb.queryItems(
    EVENTS_TABLE,
    'eventId = :eventId AND begins_with(sortKey, :prefix)',
    {
      ':eventId': eventId,
      ':prefix': 'Contest',
    }
  );
  return items as ContestRecord[];
}

/**
 * Get specific contest by contestId (using GSI)
 */
export async function getContestById(contestId: string): Promise<ContestRecord | null> {
  const items = await dynamodb.queryItems(
    EVENTS_TABLE,
    'contestId = :contestId',
    { ':contestId': contestId },
    { indexName: 'contestId-index', limit: 1 }
  );
  return items[0] as ContestRecord | null;
}

/**
 * Get contest by eventId + sortKey (direct key lookup)
 */
export async function getContest(
  eventId: string,
  sortKey: string
): Promise<ContestRecord | null> {
  const item = await dynamodb.getItem(EVENTS_TABLE, { eventId, sortKey });
  return item as ContestRecord | null;
}

/**
 * Get participation records of an event. If no contestId is provided returns all record from all contests
 */
export async function getParticipationRecords(
  eventId: string,
  contestId?: string
): Promise<AthleteParticipationRecord[]> {
  const records = await dynamodb.scanItems(USERS_TABLE, {
    filterExpression: 'eventId = :eventId AND begins_with(sortKey, :prefix)',
    expressionAttributeValues: {
      ':eventId': eventId,
      ':prefix': `Participation`,
    },
  });

  if (contestId) {
    return records.filter(({ contestId: recordContestId }) => recordContestId === contestId );
  }

  return records;
}

/**
 * Keep athlete Participation:* records in sync with the active contest result set.
 * These are the per-user lookup records used by athlete dashboards and ranking queries.
 */
export async function syncContestParticipationRecords(
  eventId: string,
  contest: ContestRecord
): Promise<void> {
  const {
    discipline,
    contestDate,
    contestId,
  } = contest;

  const contestName = `${discipline || 'Contest'} / ${typeof contest.gender === 'string' ? contest.gender : 'ALL'} / ${typeof contest.ageCategory === 'string' ? contest.ageCategory : 'ALL'}`;

  const activeUserIds = new Set<string>();

  for (const result of contest.results) {
    if (!result || typeof result !== 'object') continue;

    const userId = typeof result.id === 'string' ? result.id : null;
    if (!userId) continue;

    const participation: AthleteParticipationRecord = {
      userId,
      sortKey: `Participation:${contestId}`,
      eventId,
      contestId,
      discipline,
      place: Number(result.rank ?? 0),
      points: String(result.isaPoints ?? 0),
      contestDate,
      contestName,
    };

    activeUserIds.add(userId);
    await dynamodb.putItem(USERS_TABLE, participation as unknown as Record<string, unknown>);
  }

  // Remove stale Participation:* entries for this contest if a result was removed.
  const staleItems = await getParticipationRecords(eventId, contestId);

  await Promise.all(
    (staleItems as AthleteParticipationRecord[]).map(async ({ userId, sortKey }) => {
      if (!userId || !sortKey || activeUserIds.has(userId)) {
        return;
      }
      await dynamodb.deleteItem(USERS_TABLE, { userId, sortKey });
    })
  );
}

/********************************************************************************
 * 
 * PENDING EDIT FUNCTIONS
 * 
 ********************************************************************************/

function pendingScoreEditSortKey(contestSortKey: string): string {
  return contestSortKey.replace(/^Contest:/, 'PendingScoreEdit:');
}

/**
 * Get the pending score edit staged for a contest (if any)
 */
export async function getPendingScoreEdit(
  eventId: string,
  contestSortKey: string
): Promise<PendingScoreEditRecord | null> {
  const item = await dynamodb.getItem(EVENTS_TABLE, {
    eventId,
    sortKey: pendingScoreEditSortKey(contestSortKey),
  });
  return (item as PendingScoreEditRecord | undefined) ?? null;
}

/**
 * Stage (or overwrite) a proposed judges/results edit for a contest
 */
export async function putPendingScoreEdit(record: Record<string, unknown>): Promise<void> {
  await dynamodb.putItem(EVENTS_TABLE, record);
}

/**
 * Delete a staged score edit (on approval or rejection)
 */
export async function deletePendingScoreEdit(eventId: string, contestSortKey: string): Promise<void> {
  await dynamodb.deleteItem(EVENTS_TABLE, {
    eventId,
    sortKey: pendingScoreEditSortKey(contestSortKey),
  });
}

/**
 * List all pending score edits across all events (admin review queue)
 *
 * NOTE: Table scan — acceptable here as this is a low-traffic admin-only
 * page, same precedent as getPendingEvents().
 */
export async function listPendingScoreEdits(): Promise<PendingScoreEditRecord[]> {
  const items = await dynamodb.scanItems(EVENTS_TABLE, {
    filterExpression: 'begins_with(sortKey, :prefix)',
    expressionAttributeValues: { ':prefix': 'PendingScoreEdit:' },
  });
  return (items as unknown as PendingScoreEditRecord[]) || [];
}
