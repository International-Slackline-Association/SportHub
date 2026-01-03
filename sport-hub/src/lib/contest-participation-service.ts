/**
 * Contest Participation Service
 *
 * Handles atomic updates for adding users to contests (participants/judges/organizers).
 * Uses DynamoDB UpdateExpression to prevent race conditions.
 */

import { dynamodb } from './dynamodb';
import { getReferenceUserById } from './reference-db-service';
import { getEvent, getContest } from './event-contest-service';
import type { ContestRecord } from './relational-types';

const USERS_TABLE = 'users';
const EVENTS_TABLE = 'events';

/**
 * Atomically add athlete to contest
 */
export async function addAthleteToContest(params: {
  userId: string;
  eventId: string;
  contestSortKey: string;  // e.g., "Contest1"
  place: string;
  points: number;
}) {
  const contestId = `${params.eventId}#${params.contestSortKey}`;

  // Get names from reference DB and event metadata
  const [userIdentity, event, contest] = await Promise.all([
    getReferenceUserById(params.userId),
    getEvent(params.eventId),
    getContest(params.eventId, params.contestSortKey),
  ]);

  if (!userIdentity) throw new Error(`User not found: ${params.userId}`);
  if (!event) throw new Error(`Event not found: ${params.eventId}`);
  if (!contest) throw new Error(`Contest not found: ${contestId}`);

  // 1. Update user record atomically
  await dynamodb.updateItem(
    USERS_TABLE,
    { userId: params.userId },
    {
      updateExpression: `
        SET contestParticipations = list_append(
          if_not_exists(contestParticipations, :empty), :newContest
        ),
        totalPoints = if_not_exists(totalPoints, :zero) + :points,
        contestsParticipated = if_not_exists(contestsParticipated, :zero) + :one
      `,
      expressionAttributeValues: {
        ':newContest': [{
          contestId,
          eventId: params.eventId,
          contestName: contest.contestName,
          eventName: event.name,
          place: params.place,
          points: params.points,
          date: contest.date,
          discipline: contest.discipline,
          country: event.location,
        }],
        ':empty': [],
        ':zero': 0,
        ':one': 1,
        ':points': params.points,
      },
    }
  );

  // 2. Update contest record atomically
  await dynamodb.updateItem(
    EVENTS_TABLE,
    { eventId: params.eventId, sortKey: params.contestSortKey },
    {
      updateExpression: `
        SET participants = list_append(
          if_not_exists(participants, :empty), :newParticipant
        )
      `,
      expressionAttributeValues: {
        ':newParticipant': [{
          userId: params.userId,
          name: userIdentity.name,
          place: params.place,
          points: params.points,
        }],
        ':empty': [],
      },
    }
  );

  return { success: true, contestId };
}

/**
 * Atomically add judge to contest
 */
export async function addJudgeToContest(params: {
  userId: string;
  eventId: string;
  contestSortKey: string;
  role?: 'head_judge' | 'judge' | 'assistant';
}) {
  const role = params.role || 'judge';
  const contestId = `${params.eventId}#${params.contestSortKey}`;

  const [userIdentity, event, contest] = await Promise.all([
    getReferenceUserById(params.userId),
    getEvent(params.eventId),
    getContest(params.eventId, params.contestSortKey),
  ]);

  if (!userIdentity) throw new Error(`User not found: ${params.userId}`);
  if (!event) throw new Error(`Event not found: ${params.eventId}`);
  if (!contest) throw new Error(`Contest not found: ${contestId}`);

  // 1. Update user record
  await dynamodb.updateItem(
    USERS_TABLE,
    { userId: params.userId },
    {
      updateExpression: `
        SET contestsJudged = list_append(
          if_not_exists(contestsJudged, :empty), :newContest
        ),
        totalContestsJudged = if_not_exists(totalContestsJudged, :zero) + :one
      `,
      expressionAttributeValues: {
        ':newContest': [{
          contestId,
          eventId: params.eventId,
          contestName: contest.contestName,
          eventName: event.name,
          date: contest.date,
          role,
          discipline: contest.discipline,
          country: event.location,
        }],
        ':empty': [],
        ':zero': 0,
        ':one': 1,
      },
    }
  );

  // 2. Update contest record
  await dynamodb.updateItem(
    EVENTS_TABLE,
    { eventId: params.eventId, sortKey: params.contestSortKey },
    {
      updateExpression: `
        SET judges = list_append(if_not_exists(judges, :empty), :newJudge)
      `,
      expressionAttributeValues: {
        ':newJudge': [{
          userId: params.userId,
          name: userIdentity.name,
          role,
        }],
        ':empty': [],
      },
    }
  );

  return { success: true, contestId };
}

/**
 * Atomically add organizer to event (event-level)
 */
export async function addOrganizerToEvent(params: {
  userId: string;
  eventId: string;
  role?: 'organizer' | 'co-organizer';
}) {
  const role = params.role || 'organizer';

  const [userIdentity, event] = await Promise.all([
    getReferenceUserById(params.userId),
    getEvent(params.eventId),
  ]);

  if (!userIdentity) throw new Error(`User not found: ${params.userId}`);
  if (!event) throw new Error(`Event not found: ${params.eventId}`);

  // 1. Update user record
  await dynamodb.updateItem(
    USERS_TABLE,
    { userId: params.userId },
    {
      updateExpression: `
        SET eventsOrganized = list_append(
          if_not_exists(eventsOrganized, :empty), :newEvent
        ),
        totalEventsOrganized = if_not_exists(totalEventsOrganized, :zero) + :one
      `,
      expressionAttributeValues: {
        ':newEvent': [{
          eventId: params.eventId,
          eventName: event.name,
          date: event.date,
          role,
          location: event.location,
          totalContests: event.totalContests,
        }],
        ':empty': [],
        ':zero': 0,
        ':one': 1,
      },
    }
  );

  // 2. Update event metadata record
  await dynamodb.updateItem(
    EVENTS_TABLE,
    { eventId: params.eventId, sortKey: 'metadata' },
    {
      updateExpression: `
        SET organizers = list_append(if_not_exists(organizers, :empty), :newOrganizer)
      `,
      expressionAttributeValues: {
        ':newOrganizer': [{
          userId: params.userId,
          name: userIdentity.name,
          role,
        }],
        ':empty': [],
      },
    }
  );

  return { success: true };
}

/**
 * Atomically add organizer to contest (contest-level)
 */
export async function addOrganizerToContest(params: {
  userId: string;
  eventId: string;
  contestSortKey: string;
  role?: 'organizer' | 'co-organizer';
}) {
  const role = params.role || 'organizer';
  const contestId = `${params.eventId}#${params.contestSortKey}`;

  const [userIdentity, contest] = await Promise.all([
    getReferenceUserById(params.userId),
    getContest(params.eventId, params.contestSortKey),
  ]);

  if (!userIdentity) throw new Error(`User not found: ${params.userId}`);
  if (!contest) throw new Error(`Contest not found: ${contestId}`);

  // Update contest record with organizer
  await dynamodb.updateItem(
    EVENTS_TABLE,
    { eventId: params.eventId, sortKey: params.contestSortKey },
    {
      updateExpression: `
        SET organizers = list_append(if_not_exists(organizers, :empty), :newOrganizer)
      `,
      expressionAttributeValues: {
        ':newOrganizer': [{
          userId: params.userId,
          name: userIdentity.name,
          role,
        }],
        ':empty': [],
      },
    }
  );

  return { success: true, contestId };
}
