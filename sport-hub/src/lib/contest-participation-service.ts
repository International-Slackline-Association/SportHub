/**
 * Contest Participation Service
 *
 * Handles atomic updates for adding users to contests (participants/judges/organizers).
 * Uses DynamoDB UpdateExpression to prevent race conditions.
 */

import { dynamodb, USERS_TABLE, EVENTS_TABLE } from './dynamodb';
import { getUser } from './user-service';
import { getEvent, getContest } from './event-contest-service';

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

  const [userProfile, event, contest] = await Promise.all([
    getUser(params.userId),
    getEvent(params.eventId),
    getContest(params.eventId, params.contestSortKey),
  ]);

  if (!userProfile) throw new Error(`User not found: ${params.userId}`);
  const userName = userProfile.name || userProfile.athleteSlug?.replace(/-/g, ' ') || params.userId;
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
          eventName: event.eventName,
          place: params.place,
          points: params.points,
          date: contest.contestDate,
          discipline: contest.discipline,
          country: event.country,
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
          name: userName,
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

  const [userProfile, event, contest] = await Promise.all([
    getUser(params.userId),
    getEvent(params.eventId),
    getContest(params.eventId, params.contestSortKey),
  ]);

  if (!userProfile) throw new Error(`User not found: ${params.userId}`);
  const userName = userProfile.name || userProfile.athleteSlug?.replace(/-/g, ' ') || params.userId;
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
          eventName: event.eventName,
          date: contest.contestDate,
          role,
          discipline: contest.discipline,
          country: event.country,
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
          name: userName,
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

  const [userProfile, event] = await Promise.all([
    getUser(params.userId),
    getEvent(params.eventId),
  ]);

  if (!userProfile) throw new Error(`User not found: ${params.userId}`);
  const userName = userProfile.name || userProfile.athleteSlug?.replace(/-/g, ' ') || params.userId;
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
          eventName: event.eventName,
          date: event.startDate,
          role,
          city: event.city,
          country: event.country,
          contestCount: event.contestCount,
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
    { eventId: params.eventId, sortKey: 'Metadata' },
    {
      updateExpression: `
        SET organizers = list_append(if_not_exists(organizers, :empty), :newOrganizer)
      `,
      expressionAttributeValues: {
        ':newOrganizer': [{
          userId: params.userId,
          name: userName,
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

  const [userProfile, contest] = await Promise.all([
    getUser(params.userId),
    getContest(params.eventId, params.contestSortKey),
  ]);

  if (!userProfile) throw new Error(`User not found: ${params.userId}`);
  const userName = userProfile.name || userProfile.athleteSlug?.replace(/-/g, ' ') || params.userId;
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
          name: userName,
          role,
        }],
        ':empty': [],
      },
    }
  );

  return { success: true, contestId };
}
