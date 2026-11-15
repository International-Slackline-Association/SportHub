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

import {
  getEventContests,
  getParticipationRecords,
  isPublishedEventStatus,
  scanAllEventItems,
  syncContestParticipationRecords,
} from '../event-contest-service';

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
  const metadataRecords = await scanAllEventItems({
    filterExpression: 'sortKey = :metadata',
    expressionAttributeValues: { ':metadata': 'Metadata' },
    projectionExpression: 'eventId, eventName, #status',
    expressionAttributeNames: { '#status': 'status' },
  });
  const unpublished = metadataRecords.filter((event) => !isPublishedEventStatus(event.status));
  console.log(`Found ${unpublished.length} unpublished events`);

  let total = 0;
  for (const event of unpublished) {
    for (const contest of await getEventContests(event.eventId)) {
      const participations = await getParticipationRecords(event.eventId, contest.contestId);
      if (participations.length === 0) continue;
      total += participations.length;
      console.log(
        `${DRY_RUN ? '[dry-run] would remove' : 'Removing'} ${participations.length} Participation records of ` +
        `${event.eventName ?? event.eventId} (${event.status}), contest ${contest.contestId}`
      );
      // The sync derives Participation:* from the contest's results and the
      // event status, so for an unpublished event it removes them all.
      if (EXECUTE) {
        await syncContestParticipationRecords(event.eventId, contest);
      }
    }
  }

  console.log(`${DRY_RUN ? 'Would remove' : 'Removed'} ${total} Participation records`);
  if (EXECUTE && total > 0) {
    console.log('Run `pnpm revalidate:all` after changing production data.');
  }
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
