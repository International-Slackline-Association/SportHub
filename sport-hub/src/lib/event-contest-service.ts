/**
 * Event/Contest Service
 *
 * Handles CRUD operations for Event → Contest hierarchy.
 * Events contain multiple contests as child records using composite key (PK + SK).
 */

import { dynamodb, EVENTS_TABLE } from './dynamodb';
import type { EventMetadataRecord, ContestRecord, EventOrganizer } from './relational-types';

/**
 * Create new event (metadata record only)
 */
export async function createEvent(params: {
  eventId: string;
  eventName: string;
  type: 'competition' | 'clinic' | 'meetup';
  startDate: string;
  endDate?: string;
  city?: string;
  country: string;
  organizers?: EventOrganizer[];
}): Promise<EventMetadataRecord> {
  const event: EventMetadataRecord = {
    eventId: params.eventId,
    sortKey: 'Metadata',
    type: params.type,
    eventName: params.eventName,
    startDate: params.startDate,
    endDate: params.endDate || params.startDate,
    city: params.city,
    country: params.country,
    organizers: params.organizers || [],
    contestCount: 0,
    createdAt: Date.now(),
  };

  await dynamodb.putItem(EVENTS_TABLE, event as unknown as Record<string, unknown>);
  return event;
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
 * Create contest within an event
 */
export async function createContest(params: {
  eventId: string;
  discipline: string;
  contestDate: string;
  ageCategory?: string;
  gender?: string;
}): Promise<ContestRecord> {
  // Get event to determine next contest number
  const event = await getEvent(params.eventId);
  if (!event) throw new Error(`Event not found: ${params.eventId}`);

  const contestNumber = event.contestCount + 1;
  const sortKey = `Contest:${params.discipline}:${params.eventId}-${contestNumber}`;
  const contestId = `${params.eventId}#${contestNumber}`;
  const dateSortKey = `${params.contestDate}#${params.eventId}`;

  const contest: ContestRecord = {
    eventId: params.eventId,
    sortKey,
    contestId,
    discipline: params.discipline,
    contestDate: params.contestDate,
    dateSortKey,
    ageCategory: params.ageCategory,
    gender: params.gender,
    results: [],
    judges: [],
    organizers: [],
  };

  // Atomic: Create contest and increment event's contestCount
  await dynamodb.putItem(EVENTS_TABLE, contest as unknown as Record<string, unknown>);
  await dynamodb.updateItem(
    EVENTS_TABLE,
    { eventId: params.eventId, sortKey: 'Metadata' },
    {
      updateExpression: 'SET contestCount = contestCount + :one',
      expressionAttributeValues: { ':one': 1 },
    }
  );

  return contest;
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
 * Equivalent to the local `getEvent()` in events/submit/actions.ts — returns
 * `{ ...metadataOnly, contests }` where contests are separate Contest:* records
 * (or the embedded array for old-format events).
 */
export async function getAssembledEvent(
  eventId: string
): Promise<{ success: boolean; event: Record<string, unknown> | null }> {
  try {
    const metadata = await dynamodb.getItem(EVENTS_TABLE, { eventId, sortKey: 'Metadata' });
    if (!metadata) {
      return { success: false, event: null };
    }

    const contestItems = await dynamodb.queryItems(
      EVENTS_TABLE,
      'eventId = :eid AND begins_with(sortKey, :prefix)',
      { ':eid': eventId, ':prefix': 'Contest:' },
    );

    const sortedContests = [...contestItems].sort(
      (a, b) => ((a.contestIndex as number) || 0) - ((b.contestIndex as number) || 0)
    );
    const { contests: embeddedContests, ...metadataOnly } = metadata as Record<string, unknown>;
    const contests = sortedContests.length > 0
      ? sortedContests
      : (embeddedContests as Record<string, unknown>[]) || [];

    return { success: true, event: { ...metadataOnly, contests } };
  } catch (error) {
    console.error('Error fetching event:', error);
    return { success: false, event: null };
  }
}

/**
 * Delete all Contest:* records for an event (leaves Metadata intact)
 */
export async function deleteEventContestRecords(eventId: string): Promise<void> {
  const items = await dynamodb.queryItems(
    EVENTS_TABLE,
    'eventId = :eid AND begins_with(sortKey, :prefix)',
    { ':eid': eventId, ':prefix': 'Contest:' },
  );
  await Promise.all(
    items.map(item => dynamodb.deleteItem(EVENTS_TABLE, { eventId, sortKey: item.sortKey }))
  );
}

/**
 * Write contest form values as separate Contest:* records
 */
export async function saveEventContestRecords(
  eventId: string,
  contests: Record<string, unknown>[]
): Promise<void> {
  for (let i = 0; i < contests.length; i++) {
    await dynamodb.putItem(EVENTS_TABLE, {
      eventId,
      sortKey: `Contest:${contests[i].discipline}:${i}`,
      contestIndex: i,
      ...contests[i],
    });
  }
}

/**
 * Scan all items in the events table
 *
 * Replaces bare `dynamodb.scanItems(EVENTS_TABLE)` calls in action files.
 */
export async function scanAllEventItems(
  options?: Parameters<typeof dynamodb.scanItems>[1]
): Promise<Record<string, unknown>[]> {
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
