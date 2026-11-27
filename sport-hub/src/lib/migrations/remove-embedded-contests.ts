#!/usr/bin/env node
/**
 * Migration: remove embedded contests from event Metadata items
 *
 * Some Metadata items carry a `contests` attribute with copies of the
 * event's contests (written on approval by older code, or by very old
 * events). The app now reads contests only from the Contest:* items, so
 * this script:
 *   1. creates a Contest:* item for every embedded contest that has none
 *      (and syncs its Participation:* records),
 *   2. reports embedded contests whose results or judges differ from the
 *      existing Contest:* item (the Contest:* item is kept),
 *   3. removes the `contests` attribute from the Metadata item.
 *
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   pnpm migrate:embedded-contests:dry-run
 *   pnpm migrate:embedded-contests:execute
 *   Production: DB_REGION=eu-central-1 npx tsx src/lib/migrations/remove-embedded-contests.ts --dry-run|--execute
 */

import {
  getContestSortKey,
  getEventContests,
  putEventItem,
  scanAllEventItems,
  syncContestParticipationRecords,
} from '../event-contest-service';
import type { ContestRecord, EventMetadataRecord } from '../relational-types';

const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');

if (!DRY_RUN && !EXECUTE) {
  console.error('❌ Error: Must specify either --dry-run or --execute');
  process.exit(1);
}

type MetadataWithEmbedded = EventMetadataRecord & { contests?: ContestRecord[] };

const sameEntries = (a: unknown, b: unknown) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

async function main(): Promise<void> {
  const metadataRecords = (await scanAllEventItems({
    filterExpression: 'sortKey = :metadata AND attribute_exists(contests)',
    expressionAttributeValues: { ':metadata': 'Metadata' },
  })) as MetadataWithEmbedded[];
  console.log(`Found ${metadataRecords.length} events with embedded contests`);

  let created = 0;
  let differing = 0;
  let skipped = 0;

  for (const metadata of metadataRecords) {
    const { contests: embedded = [], ...metadataOnly } = metadata;
    const label = `${metadata.eventName ?? metadata.name ?? ''} (${metadata.eventId}, ${metadata.status ?? 'no status'})`;
    const existing = await getEventContests(metadata.eventId);
    const isLegacyEventId = metadata.eventId.startsWith('Event:');

    for (const [idx, ec] of embedded.entries()) {
      if (!ec?.contestId) {
        console.log(`⚠️  ${label}: embedded contest #${idx} has no contestId, skipped`);
        skipped += 1;
        continue;
      }
      const sortKey = ec.sortKey || getContestSortKey(ec);
      const match = existing.find((c) => c.sortKey === sortKey || c.contestId === ec.contestId);

      if (!match) {
        const record: ContestRecord = {
          ...ec,
          eventId: metadata.eventId,
          sortKey,
          contestIndex: ec.contestIndex ?? idx,
          // Legacy event ids are matched to their contests by city (see getAssembledEvent)
          ...(isLegacyEventId && !ec.city && metadata.city ? { city: metadata.city } : {}),
        };
        console.log(`${DRY_RUN ? '[dry-run] would create' : 'Creating'} ${sortKey} for ${label}`);
        if (EXECUTE) {
          await putEventItem(record as unknown as Record<string, unknown>);
          await syncContestParticipationRecords(metadata.eventId, record);
        }
        created += 1;
      } else if (!sameEntries(match.results, ec.results) || !sameEntries(match.judges, ec.judges)) {
        console.log(`ℹ️  ${label}: embedded ${sortKey} differs from the Contest record; keeping the Contest record`);
        differing += 1;
      }
    }

    console.log(`${DRY_RUN ? '[dry-run] would remove' : 'Removing'} embedded contests (${embedded.length}) from ${label}`);
    if (EXECUTE) {
      await putEventItem(metadataOnly as unknown as Record<string, unknown>);
    }
  }

  console.log(
    `${DRY_RUN ? 'Would create' : 'Created'} ${created} Contest records; ` +
    `${differing} embedded copies differed (Contest record kept); ${skipped} skipped; ` +
    `${metadataRecords.length} Metadata items ${DRY_RUN ? 'to clean' : 'cleaned'}`
  );
  if (EXECUTE && metadataRecords.length > 0) {
    console.log('Run `pnpm revalidate:all` after changing production data.');
  }
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
