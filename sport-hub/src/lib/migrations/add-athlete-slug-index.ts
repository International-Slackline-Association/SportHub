#!/usr/bin/env node
/**
 * Migration: Add athleteSlug-index GSI, de-duplicate, and backfill athleteSlug
 *
 * Adds the athleteSlug-index GSI (HASH: athleteSlug) to the sporthub-users
 * table, then:
 *   1. Regenerates any athleteSlug containing a literal "--" from the
 *      profile's own name/surname. This is the signature of slugs produced
 *      by the old `${name}--${surname}` template (or copied verbatim from a
 *      legacy ISA-Rankings PK, e.g. "sascha--saschg-saschg" — derived from an
 *      old username/handle, not the athlete's actual name "Sascha Grill").
 *   2. De-duplicates existing athleteSlug collisions — the ISA-Rankings
 *      migration/world-records import already produced ~198 pairs of
 *      profiles sharing the same slug (typically a full imported athlete
 *      profile plus a bare-name stub auto-created by a world-records/firsts
 *      import that couldn't find an exact match and copied the wrong slug).
 *      Left alone, a shared slug makes the reverse lookup
 *      (getUserIdByAthleteSlug) non-deterministically resolve to whichever
 *      duplicate DynamoDB returns first — i.e. the wrong athlete's page
 *      (and photo) can be shown. One profile per group keeps its slug
 *      (the one with the most identity signals: isaUsersId, email, surname);
 *      every other member gets a freshly generated, uniqueness-checked slug.
 *   3. Backfills athleteSlug for Profile records that have a name but no
 *      slug yet — using the same generateUniqueAthleteSlug helper the app
 *      itself uses at onboarding/enrichment time (src/lib/user-service.ts).
 *
 * Idempotent — safe to re-run: skips the GSI step if it already exists, skips
 * groups with no duplicates, and skips records that already have a slug.
 *
 * Usage:
 *   pnpm migrate:athlete-slug:dry-run
 *   pnpm migrate:athlete-slug:execute
 *   pnpm migrate:athlete-slug:aws:dry-run
 *   pnpm migrate:athlete-slug:aws:execute
 */

import { DescribeTableCommand, UpdateTableCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, dynamodb, getTableName, USERS_TABLE } from '../dynamodb';
import { generateUniqueAthleteSlug, slugBase as previewSlug } from '../user-service';
import type { UserProfileRecord } from '../relational-types';

const DRY_RUN = process.argv.includes('--dry-run');
const EXECUTE = process.argv.includes('--execute');

const isDirectRun = process.argv[1]?.includes('add-athlete-slug-index');
if (isDirectRun && !DRY_RUN && !EXECUTE) {
  console.error('❌ Error: Must specify either --dry-run or --execute');
  console.log('Usage:');
  console.log('  pnpm tsx src/lib/migrations/add-athlete-slug-index.ts --dry-run');
  console.log('  pnpm tsx src/lib/migrations/add-athlete-slug-index.ts --execute');
  process.exit(1);
}

const GSI_NAME = 'athleteSlug-index';

async function ensureGsiExists(): Promise<void> {
  const tableName = getTableName(USERS_TABLE);
  const describe = await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
  const exists = describe.Table?.GlobalSecondaryIndexes?.some(gsi => gsi.IndexName === GSI_NAME);

  if (exists) {
    console.log(`✅ ${GSI_NAME} already exists on ${tableName}`);
    return;
  }

  if (DRY_RUN) {
    console.log(`🔍 [DRY RUN] Would add ${GSI_NAME} to ${tableName}`);
    return;
  }

  console.log(`🚀 Adding ${GSI_NAME} to ${tableName}...`);
  await dynamoClient.send(new UpdateTableCommand({
    TableName: tableName,
    AttributeDefinitions: [
      { AttributeName: 'athleteSlug', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexUpdates: [
      {
        Create: {
          IndexName: GSI_NAME,
          KeySchema: [{ AttributeName: 'athleteSlug', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
        },
      },
    ],
  }));

  console.log(`⏳ Waiting for ${GSI_NAME} to become active (can take a few minutes on AWS)...`);
  const start = Date.now();
  const maxWaitMs = 5 * 60 * 1000;
  while (Date.now() - start < maxWaitMs) {
    const check = await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
    const gsi = check.Table?.GlobalSecondaryIndexes?.find(g => g.IndexName === GSI_NAME);
    if (gsi?.IndexStatus === 'ACTIVE') {
      console.log(`✅ ${GSI_NAME} is active`);
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error(`${GSI_NAME} did not become active within ${maxWaitMs}ms`);
}

async function regenerateMalformedSlugs(): Promise<void> {
  console.log('\n🔎 Scanning sporthub-users for malformed ("--") athleteSlug values...');
  const items = await dynamodb.scanItems(USERS_TABLE, {
    filterExpression: 'sortKey = :profile AND attribute_exists(athleteSlug) AND contains(athleteSlug, :dd)',
    expressionAttributeValues: { ':profile': 'Profile', ':dd': '--' },
  }) as UserProfileRecord[];

  console.log(`Found ${items.length} profile(s) with a malformed athleteSlug.`);

  let fixed = 0;
  for (const profile of items) {
    if (!profile.name) {
      console.log(`  ⚠️  ${profile.userId} has malformed slug "${profile.athleteSlug}" but no name — leaving as-is.`);
      continue;
    }

    if (DRY_RUN) {
      const preview = previewSlug(profile.name, profile.surname);
      console.log(`  [DRY RUN] ${profile.userId}: "${profile.athleteSlug}" -> ~${preview} (may get a -2/-3 suffix if it collides)`);
      continue;
    }

    const newSlug = await generateUniqueAthleteSlug(profile.name, profile.surname, profile.userId);
    await dynamodb.updateItem(USERS_TABLE, { userId: profile.userId, sortKey: 'Profile' }, {
      updateExpression: 'SET athleteSlug = :slug',
      expressionAttributeValues: { ':slug': newSlug, ':oldSlug': profile.athleteSlug },
      conditionExpression: 'athleteSlug = :oldSlug', // don't clobber if it changed since we scanned
    });
    fixed++;
    if (fixed % 50 === 0) console.log(`  ...${fixed}/${items.length} fixed`);
  }

  console.log(
    DRY_RUN
      ? `🔍 [DRY RUN] Would regenerate ${items.length} malformed athleteSlug(s).`
      : `✅ Regenerated ${fixed} malformed athleteSlug(s).`
  );
}

/** Rough completeness signal used to decide which duplicate keeps the slug. */
function identityScore(profile: UserProfileRecord): number {
  let score = 0;
  if (profile.isaUsersId) score += 4;
  if (profile.email) score += 2;
  if (profile.surname) score += 2;
  if (profile.name && /[A-Z]/.test(profile.name[0])) score += 1; // properly-cased vs lowercase stub
  return score;
}

async function dedupeSlugs(): Promise<void> {
  console.log('\n🔎 Scanning sporthub-users for duplicate athleteSlug values...');
  const items = await dynamodb.scanItems(USERS_TABLE, {
    filterExpression: 'sortKey = :profile AND attribute_exists(athleteSlug)',
    expressionAttributeValues: { ':profile': 'Profile' },
  }) as UserProfileRecord[];

  const bySlug = new Map<string, UserProfileRecord[]>();
  for (const item of items) {
    const slug = item.athleteSlug!;
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug)!.push(item);
  }

  const groups = [...bySlug.entries()].filter(([, group]) => group.length > 1);
  const toReassignCount = groups.reduce((n, [, g]) => n + g.length - 1, 0);
  console.log(`Found ${groups.length} duplicate athleteSlug group(s) — ${toReassignCount} profile(s) need a new slug.`);

  let reassigned = 0;
  for (const [slug, group] of groups) {
    // Keep the slug on whichever profile has the most identity signals; tie-break by earliest createdAt.
    const sorted = [...group].sort((a, b) => {
      const scoreDiff = identityScore(b) - identityScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.createdAt ?? 0) - (b.createdAt ?? 0);
    });
    const [keep, ...rest] = sorted;

    if (DRY_RUN) {
      console.log(`  [DRY RUN] "${slug}" kept by ${keep.userId} (${keep.name} ${keep.surname || ''}); reassigning: ${rest.map(r => `${r.userId} (${r.name || 'no name'})`).join(', ')}`);
      continue;
    }

    for (const dup of rest) {
      if (!dup.name) continue; // can't slugify a nameless stub — leave it as-is rather than guess
      const newSlug = await generateUniqueAthleteSlug(dup.name, dup.surname);
      await dynamodb.updateItem(USERS_TABLE, { userId: dup.userId, sortKey: 'Profile' }, {
        updateExpression: 'SET athleteSlug = :slug',
        expressionAttributeValues: { ':slug': newSlug, ':oldSlug': slug },
        conditionExpression: 'athleteSlug = :oldSlug', // don't clobber if it changed since we scanned
      });
      reassigned++;
    }
  }

  console.log(
    DRY_RUN
      ? `🔍 [DRY RUN] Would reassign ${toReassignCount} duplicate profile(s) to a new, unique athleteSlug.`
      : `✅ Reassigned ${reassigned} duplicate profile(s) to a new, unique athleteSlug.`
  );
}

async function backfillSlugs(): Promise<void> {
  console.log('\n🔎 Scanning sporthub-users for Profile records missing athleteSlug...');
  // One-off offline migration scan — not a runtime hot path, unlike the
  // GSI-based lookups used at request time (getUserIdByAthleteSlug).
  const items = await dynamodb.scanItems(USERS_TABLE, {
    filterExpression: 'sortKey = :profile AND attribute_exists(#name) AND attribute_not_exists(athleteSlug)',
    expressionAttributeNames: { '#name': 'name' },
    expressionAttributeValues: { ':profile': 'Profile' },
  }) as UserProfileRecord[];

  console.log(`Found ${items.length} profile(s) with a name but no athleteSlug.`);

  let updated = 0;
  for (const profile of items) {
    if (!profile.name) continue; // defensive; filter already guarantees this

    if (DRY_RUN) {
      const preview = previewSlug(profile.name, profile.surname);
      console.log(`  [DRY RUN] ${profile.userId} (${profile.name} ${profile.surname || ''}) -> ~${preview} (may get a -2/-3 suffix if it collides)`);
      continue;
    }

    const slug = await generateUniqueAthleteSlug(profile.name, profile.surname);
    await dynamodb.updateItem(USERS_TABLE, { userId: profile.userId, sortKey: 'Profile' }, {
      updateExpression: 'SET athleteSlug = :slug',
      expressionAttributeValues: { ':slug': slug },
      conditionExpression: 'attribute_not_exists(athleteSlug)', // don't clobber a slug set concurrently (e.g. a login enrichment)
    });
    updated++;
    if (updated % 50 === 0) console.log(`  ...${updated}/${items.length} updated`);
  }

  console.log(
    DRY_RUN
      ? `🔍 [DRY RUN] Would update ${items.length} profile(s) with a new athleteSlug.`
      : `✅ Updated ${updated} profile(s) with a new athleteSlug.`
  );
}

async function main() {
  console.log(`\n=== athleteSlug-index migration (${DRY_RUN ? 'DRY RUN' : 'EXECUTE'}) ===\n`);
  await ensureGsiExists();
  await regenerateMalformedSlugs();
  await dedupeSlugs();
  await backfillSlugs();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
