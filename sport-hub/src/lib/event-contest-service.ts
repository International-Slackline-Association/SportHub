/**
 * Event/Contest Service
 *
 * Handles CRUD operations for Event → Contest hierarchy.
 * Events contain multiple contests as child records using composite key (PK + SK).
 */

import { dynamodb } from './dynamodb';
import type { EventMetadata, ContestRecord, EventOrganizer } from './relational-types';

const EVENTS_TABLE = 'events';

/**
 * Create new event (metadata record only)
 */
export async function createEvent(params: {
  eventId: string;
  name: string;
  type: 'competition' | 'clinic' | 'meetup';
  date: string;
  location: string;
  organizers?: EventOrganizer[];
}): Promise<EventMetadata> {
  const event: EventMetadata = {
    eventId: params.eventId,
    sortKey: 'metadata',
    type: params.type,
    name: params.name,
    date: params.date,
    location: params.location,
    organizers: params.organizers || [],
    totalContests: 0,
    createdAt: new Date().toISOString(),
  };

  await dynamodb.putItem(EVENTS_TABLE, event);
  return event;
}

/**
 * Get event metadata
 */
export async function getEvent(eventId: string): Promise<EventMetadata | null> {
  const item = await dynamodb.getItem(EVENTS_TABLE, {
    eventId,
    sortKey: 'metadata',
  });
  return item as EventMetadata | null;
}

/**
 * Create contest within an event
 */
export async function createContest(params: {
  eventId: string;
  contestName: string;
  discipline: string;
  date: string;
  category?: string;
  gender?: string;
}): Promise<ContestRecord> {
  // Get event to determine next contest number
  const event = await getEvent(params.eventId);
  if (!event) throw new Error(`Event not found: ${params.eventId}`);

  const contestNumber = event.totalContests + 1;
  const sortKey = `Contest${contestNumber}`;
  const contestId = `${params.eventId}#${sortKey}`;

  const contest: ContestRecord = {
    eventId: params.eventId,
    sortKey,
    contestId,
    contestName: params.contestName,
    discipline: params.discipline,
    date: params.date,
    category: params.category,
    gender: params.gender,
    participants: [],
    judges: [],
    organizers: [],
    createdAt: new Date().toISOString(),
  };

  // Atomic: Create contest and increment event's totalContests
  await dynamodb.putItem(EVENTS_TABLE, contest);
  await dynamodb.updateItem(
    EVENTS_TABLE,
    { eventId: params.eventId, sortKey: 'metadata' },
    {
      updateExpression: 'SET totalContests = totalContests + :one',
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
  updates: Partial<Omit<EventMetadata, 'eventId' | 'sortKey' | 'totalContests'>>
): Promise<EventMetadata | null> {
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  // Build update expression dynamically
  if (updates.name !== undefined) {
    updateExpressions.push('#name = :name');
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = updates.name;
  }

  if (updates.date !== undefined) {
    updateExpressions.push('#date = :date');
    expressionAttributeNames['#date'] = 'date';
    expressionAttributeValues[':date'] = updates.date;
  }

  if (updates.location !== undefined) {
    updateExpressions.push('#location = :location');
    expressionAttributeNames['#location'] = 'location';
    expressionAttributeValues[':location'] = updates.location;
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
    { eventId, sortKey: 'metadata' },
    {
      updateExpression: `SET ${updateExpressions.join(', ')}`,
      expressionAttributeNames,
      expressionAttributeValues,
    }
  );

  return result as EventMetadata;
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
