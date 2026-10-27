#!/usr/bin/env node
/**
 * Moves record categories to the simplified shape: name, description, group
 * (Length, Endurance, Speed, Altitude, Other), unit, direction and status.
 *
 * - Seeded categories take their group and unit from the seed list.
 * - Other categories map their old free-text group (e.g. "Highline height" → Altitude).
 * - Coordinate categories get the unit "°".
 * - Drops the removed fields (line type, leashed, joint, rule checklists, value type)
 *   from categories, and the rule confirmations from record entries.
 * - Renames the "list" field of record and first entries to "gender", with the
 *   contest gender values (MEN → MEN_ONLY, WOMEN → WOMEN_ONLY, MIXED stays).
 *
 * Usage:
 *   DYNAMODB_LOCAL=true tsx src/lib/migrations/migrate-record-categories.ts --dry-run
 *   DYNAMODB_LOCAL=true tsx src/lib/migrations/migrate-record-categories.ts --execute
 */

import type { ClaimStatus, RecordCategoryGroup, RecordCategoryRecord, WorldEntryRecord } from '../relational-types';
import { RECORD_CATEGORY_GROUPS } from '../relational-types';
import { RECORD_CATEGORY_SEEDS } from '../records-categories';

const execute = process.argv.includes('--execute');

const OLD_GROUPS: Record<string, RecordCategoryGroup> = {
  'highline length': 'Length',
  'longline length': 'Length',
  'longline length over ground': 'Length',
  'waterline length': 'Length',
  'highline height': 'Altitude',
  'speed highline': 'Speed',
  'speed highlines': 'Speed',
  'speedline over ground': 'Speed',
  'speedlines over ground': 'Speed',
  endurance: 'Endurance',
  rigging: 'Other',
  trick: 'Other',
  tricks: 'Other',
};

type LegacyCategory = RecordCategoryRecord & { valueType?: string };

const mapGroup = (group: string): RecordCategoryGroup =>
  (RECORD_CATEGORY_GROUPS as readonly string[]).includes(group)
    ? (group as RecordCategoryGroup)
    : OLD_GROUPS[group.toLowerCase().trim()] ?? 'Other';

export const migrateCategory = (old: LegacyCategory): RecordCategoryRecord => {
  const seed = RECORD_CATEGORY_SEEDS.find(s => s.categoryId === old.categoryId);
  return {
    pk: 'RecordCategory',
    sortKey: old.sortKey,
    categoryId: old.categoryId,
    name: old.name,
    description: old.description,
    group: seed?.group ?? mapGroup(old.group ?? ''),
    unit: old.valueType === 'coordinates' ? '°' : seed?.unit ?? old.unit,
    direction: old.direction,
    status: old.status,
    order: old.order,
    createdAt: old.createdAt,
    updatedAt: old.updatedAt,
  };
};

type LegacyGender = ContestGender | 'MEN' | 'WOMEN';
type LegacyEntry = Omit<WorldEntryRecord, 'gender'> & { gender?: LegacyGender; list?: LegacyGender; ruleConfirmations?: string[] };

const toContestGender = (gender: LegacyGender | undefined): ContestGender =>
  gender === 'WOMEN' || gender === 'WOMEN_ONLY' ? 'WOMEN_ONLY' : gender === 'MIXED' ? 'MIXED' : 'MEN_ONLY';

/** Entry without the rule confirmations, with "list" as "gender" in contest values, or null when already migrated. */
export const migrateEntry = (old: LegacyEntry): WorldEntryRecord | null => {
  const gender = toContestGender(old.gender ?? old.list);
  if (!('list' in old) && !('ruleConfirmations' in old) && old.gender === gender) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { list, ruleConfirmations, ...rest } = old;
  return { ...rest, gender } as WorldEntryRecord;
};

async function main() {
  if (process.env.DYNAMODB_LOCAL !== 'true') throw new Error('This migration only runs against the local database (DYNAMODB_LOCAL=true)');
  const { dynamodb, RECORDS_TABLE } = await import('../dynamodb');
  const service = await import('../records-service');

  const categories = (await service.getRecordCategories()) as LegacyCategory[];
  let changedCategories = 0;
  for (const old of categories) {
    const next = migrateCategory(old);
    if (JSON.stringify(next) === JSON.stringify(old)) continue;
    changedCategories++;
    console.log(`${old.categoryId}: group "${old.group}" → ${next.group}, unit "${old.unit}" → "${next.unit}"`);
    if (execute) await dynamodb.putItem(RECORDS_TABLE, next as unknown as Record<string, unknown>);
  }

  const statuses: ClaimStatus[] = ['draft', 'pending', 'changes_requested', 'published', 'rejected', 'historical'];
  const entries = (await Promise.all(
    (['record', 'first'] as const).flatMap(kind => statuses.map(status => service.getEntriesByStatus(kind, status))),
  )).flat();

  let changedEntries = 0;
  for (const entry of entries) {
    const next = migrateEntry(entry as LegacyEntry);
    if (!next) continue;
    changedEntries++;
    if (execute) await dynamodb.putItem(RECORDS_TABLE, next as unknown as Record<string, unknown>);
  }

  console.log(`\n${execute ? '✅ Updated' : 'Dry run: would update'} ${changedCategories} categories and ${changedEntries} entries.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
