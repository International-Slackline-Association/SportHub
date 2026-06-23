#!/usr/bin/env tsx
/**
 * Copy SportHub DynamoDB tables from AWS down to local DynamoDB.
 *
 * Pulls the AWS dev tables (sporthub-users-dev, sporthub-events-dev) into the
 * local Docker DynamoDB (local-sporthub-users, local-sporthub-events). This is
 * the reverse of scripts/sync-dynamodb.ts.
 *
 * If a local target table already exists you are prompted to either:
 *   - [d]elete & recreate  → drop the local table and rebuild it for a clean copy
 *   - [i]dempotent copy    → keep the table, overwrite items in place (upsert)
 *   - [s]kip               → leave the table untouched
 *
 * Usage:
 *   pnpm copy:sporthub-from-aws                 # interactive prompt when tables exist
 *   pnpm copy:sporthub-from-aws --delete        # always drop & recreate existing tables
 *   pnpm copy:sporthub-from-aws --idempotent    # always upsert into existing tables
 *   pnpm copy:sporthub-from-aws --yes           # non-interactive, defaults to idempotent
 *   pnpm copy:sporthub-from-aws --help          # show usage
 */

import {
  DynamoDBClient,
  DescribeTableCommand,
  CreateTableCommand,
  DeleteTableCommand,
} from '@aws-sdk/client-dynamodb';
import type {
  TableDescription,
  GlobalSecondaryIndexDescription,
  LocalSecondaryIndexDescription,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { createInterface } from 'node:readline/promises';
import { config } from 'dotenv';

// Reuse the single source of truth for table base names.
import { USERS_TABLE, EVENTS_TABLE } from '../dynamodb';

// Load AWS credentials / region overrides.
config({ path: '.env.production' });

type DynamoDBItem = Record<string, unknown>;
type CopyMode = 'delete' | 'idempotent' | 'skip';

// AWS source: the sporthub -dev tables live in us-east-2.
const AWS_REGION = process.env.AWS_REGION || 'us-east-2';
// Local target: Docker DynamoDB.
const LOCAL_ENDPOINT = (
  process.env.DYNAMODB_ENDPOINT || 'http://127.0.0.1:8000'
).replace('localhost', '127.0.0.1');

// Naming derived from the base constants — never touches production tables.
const awsTableName = (base: string) => `${base}-dev`;
const localTableName = (base: string) => `local-${base}`;

const awsClient = new DynamoDBClient({
  region: AWS_REGION,
  maxAttempts: 3,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          ...(process.env.AWS_SESSION_TOKEN && {
            sessionToken: process.env.AWS_SESSION_TOKEN,
          }),
        }
      : undefined,
});

const localClient = new DynamoDBClient({
  region: 'us-east-2',
  endpoint: LOCAL_ENDPOINT,
  credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' },
});

const awsDdb = DynamoDBDocumentClient.from(awsClient);
const localDdb = DynamoDBDocumentClient.from(localClient);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tableExists(client: DynamoDBClient, tableName: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch {
    return false;
  }
}

async function getTableSchema(
  client: DynamoDBClient,
  tableName: string
): Promise<TableDescription | undefined> {
  try {
    const response = await client.send(new DescribeTableCommand({ TableName: tableName }));
    return response.Table;
  } catch {
    return undefined;
  }
}

async function scanAllItems(
  docClient: DynamoDBDocumentClient,
  tableName: string
): Promise<DynamoDBItem[]> {
  const items: DynamoDBItem[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const response = await docClient.send(
      new ScanCommand({ TableName: tableName, ExclusiveStartKey: lastKey })
    );
    if (response.Items) items.push(...response.Items);
    lastKey = response.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function createTable(
  client: DynamoDBClient,
  schema: TableDescription,
  targetName: string
) {
  await client.send(
    new CreateTableCommand({
      TableName: targetName,
      KeySchema: schema.KeySchema,
      AttributeDefinitions: schema.AttributeDefinitions,
      BillingMode: 'PAY_PER_REQUEST',
      ...(schema.GlobalSecondaryIndexes && {
        GlobalSecondaryIndexes: schema.GlobalSecondaryIndexes.map(
          (gsi: GlobalSecondaryIndexDescription) => ({
            IndexName: gsi.IndexName,
            KeySchema: gsi.KeySchema,
            Projection: gsi.Projection,
          })
        ),
      }),
      ...(schema.LocalSecondaryIndexes && {
        LocalSecondaryIndexes: schema.LocalSecondaryIndexes.map(
          (lsi: LocalSecondaryIndexDescription) => ({
            IndexName: lsi.IndexName,
            KeySchema: lsi.KeySchema,
            Projection: lsi.Projection,
          })
        ),
      }),
    })
  );

  // Wait for table to become active.
  let active = false;
  while (!active) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const desc = await getTableSchema(client, targetName);
    active = desc?.TableStatus === 'ACTIVE';
  }
}

async function deleteTable(client: DynamoDBClient, tableName: string) {
  await client.send(new DeleteTableCommand({ TableName: tableName }));

  // Wait for table to be fully deleted.
  let exists = true;
  while (exists) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    exists = await tableExists(client, tableName);
  }
}

async function importItems(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  items: DynamoDBItem[]
) {
  if (items.length === 0) {
    console.log('  (no items to write)');
    return;
  }

  const BATCH_SIZE = 25; // DynamoDB batch write limit
  let imported = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map((item) => ({ PutRequest: { Item: item } })),
        },
      })
    );
    imported += batch.length;
    process.stdout.write(`\r  Imported ${imported}/${items.length} items...`);
  }
  console.log('');
}

/**
 * Decide what to do with an existing local table — from flags or by prompting.
 */
async function resolveMode(localName: string, flagMode: CopyMode | null): Promise<CopyMode> {
  if (flagMode) {
    console.log(`   Mode (from flag): ${flagMode}`);
    return flagMode;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (
      await rl.question(
        `   ⚠️  Local table "${localName}" already exists. ` +
          `[d]elete & recreate, [i]dempotent copy, [s]kip? `
      )
    )
      .trim()
      .toLowerCase();

    if (answer === 'd' || answer === 'delete') return 'delete';
    if (answer === 'i' || answer === 'idempotent') return 'idempotent';
    return 'skip';
  } finally {
    rl.close();
  }
}

// ---------------------------------------------------------------------------
// Per-table copy
// ---------------------------------------------------------------------------

async function copyTable(base: string, flagMode: CopyMode | null) {
  const source = awsTableName(base);
  const target = localTableName(base);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${source} (AWS) → ${target} (local)`);
  console.log('='.repeat(60));

  // 1. Source must exist.
  const schema = await getTableSchema(awsClient, source);
  if (!schema) {
    throw new Error(
      `AWS source table "${source}" not found in region ${AWS_REGION}. ` +
        `Check AWS_REGION and credentials in .env.production.`
    );
  }

  // 2. Pull all source items up front.
  console.log(`📥 Scanning AWS table ${source}...`);
  const items = await scanAllItems(awsDdb, source);
  console.log(`✓ AWS: ${items.length} items`);

  // 3. Resolve target state.
  const exists = await tableExists(localClient, target);

  if (!exists) {
    console.log(`🔨 Creating local table ${target}...`);
    await createTable(localClient, schema, target);
  } else {
    const mode = await resolveMode(target, flagMode);

    if (mode === 'skip') {
      console.log(`⏭️  Skipped ${target} (left untouched).`);
      return;
    }

    if (mode === 'delete') {
      console.log(`🗑️  Deleting local table ${target}...`);
      await deleteTable(localClient, target);
      console.log(`🔨 Recreating local table ${target}...`);
      await createTable(localClient, schema, target);
    } else {
      // Idempotent: keep the table, warn if the key schema diverges.
      const localSchema = await getTableSchema(localClient, target);
      const schemasMatch =
        JSON.stringify(localSchema?.KeySchema) === JSON.stringify(schema.KeySchema);
      if (!schemasMatch) {
        console.log(
          '   ⚠️  Local key schema differs from AWS — items will be upserted as-is. ' +
            'Use [d]elete if you need a clean schema match.'
        );
      }
      console.log(`♻️  Idempotent copy into existing ${target}...`);
    }
  }

  // 4. Write items.
  console.log(`📤 Writing ${items.length} items to ${target}...`);
  await importItems(localDdb, target, items);
  console.log(`✅ ${target} done.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function parseFlagMode(args: string[]): CopyMode | null {
  if (args.includes('--delete')) return 'delete';
  if (args.includes('--idempotent')) return 'idempotent';
  if (args.includes('--yes') || args.includes('-y')) return 'idempotent';
  return null;
}

function printHelp() {
  console.log(`
Copy SportHub DynamoDB tables from AWS down to local DynamoDB.

  ${awsTableName(USERS_TABLE)}  →  ${localTableName(USERS_TABLE)}
  ${awsTableName(EVENTS_TABLE)}  →  ${localTableName(EVENTS_TABLE)}

Usage:
  pnpm copy:sporthub-from-aws                 Interactive prompt when a local table exists
  pnpm copy:sporthub-from-aws --delete        Always drop & recreate existing local tables
  pnpm copy:sporthub-from-aws --idempotent    Always upsert into existing local tables
  pnpm copy:sporthub-from-aws --yes           Non-interactive (defaults to idempotent)
  pnpm copy:sporthub-from-aws --help          Show this help

Prerequisites:
  - Local DynamoDB running:  pnpm db:local
  - AWS credentials in .env.production (or via aws configure)
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  const flagMode = parseFlagMode(args);

  console.log('\n🚀 Copy SportHub: AWS → Local DynamoDB\n');
  console.log(`AWS region: ${AWS_REGION}`);
  console.log(`Local:      ${LOCAL_ENDPOINT}`);
  console.log(`Mode:       ${flagMode ?? 'interactive (prompt if table exists)'}`);

  try {
    for (const base of [USERS_TABLE, EVENTS_TABLE]) {
      await copyTable(base, flagMode);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ Done. Local tables now mirror AWS dev data.');
    console.log('='.repeat(60));
    console.log('\n📝 Next: pnpm db:count  (verify)   |   pnpm test:local  (run app)\n');
  } catch (error) {
    console.error('\n❌ Copy failed:', error);
    process.exit(1);
  }
}

// Run only when executed directly.
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
