#!/usr/bin/env node
/**
 * Migration: Remove Participation:* records of unpublished events
 *
 * Until now, saving an event wrote the athletes' Participation:* records
 * immediately, so results of draft, pending and cancelled events counted in
 * rankings and athlete profiles. The app now writes them only while an event
 * is published; this script removes the ones left from before.
 *
 * Idempotent — safe to re-run. Legacy events without a status count as
 * published and are not touched.
 *
 * Usage:
 *   pnpm migrate:unpublished-participations:dry-run
 *   pnpm migrate:unpublished-participations:execute
 *   pnpm migrate:unpublished-participations:aws:dry-run
 *   pnpm migrate:unpublished-participations:aws:execute
 */

import { dynamodb, EVENTS_TABLE, USERS_TABLE } from '../dynamodb';
import type { AthleteParticipationRecord, EventMetadataRecord } from '../relational-types';

const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');

if (!DRY_RUN && !EXECUTE) {
  console.error('❌ Error: Must specify either --dry-run or --execute');
  console.log('Usage:');
  console.log('  pnpm tsx src/lib/migrations/remove-unpublished-participations.ts --dry-run');
  console.log('  pnpm tsx src/lib/migrations/remove-unpublished-participations.ts --execute');
  process.exit(1);
}

async function main(): Promise<void> {
  const metadataRecords = (await dynamodb.scanItems(EVENTS_TABLE, {
    filterExpression: 'sortKey = :metadata',
    expressionAttributeValues: { ':metadata': 'Metadata' },
    projectionExpression: 'eventId, eventName, #status',
    expressionAttributeNames: { '#status': 'status' },
  })) as Pick<EventMetadataRecord, 'eventId' | 'eventName' | 'status'>[];

  const unpublished = new Map(
    metadataRecords
      // Same rule as isPublishedEventStatus in event-contest-service
      .filter((event) => event.status !== undefined && event.status !== null && event.status !== 'published')
      .map((event) => [event.eventId, event])
  );
  console.log(`Found ${unpublished.size} unpublished events`);

  const participations = (await dynamodb.scanItems(USERS_TABLE, {
    filterExpression: 'begins_with(sortKey, :prefix)',
    expressionAttributeValues: { ':prefix': 'Participation:' },
    projectionExpression: 'userId, sortKey, eventId',
  })) as Pick<AthleteParticipationRecord, 'userId' | 'sortKey' | 'eventId'>[];

  const stale = participations.filter((p) => unpublished.has(p.eventId));
  for (const p of stale) {
    const event = unpublished.get(p.eventId);
    console.log(`${DRY_RUN ? '[dry-run] would delete' : 'Deleting'} ${p.userId} ${p.sortKey} (${event?.eventName ?? p.eventId}, ${event?.status})`);
    if (EXECUTE) {
      await dynamodb.deleteItem(USERS_TABLE, { userId: p.userId, sortKey: p.sortKey });
    }
  }

  console.log(`${DRY_RUN ? 'Would delete' : 'Deleted'} ${stale.length} Participation records`);
  if (EXECUTE && stale.length > 0) {
    console.log('Run `pnpm revalidate:all` after changing production data.');
  }
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
