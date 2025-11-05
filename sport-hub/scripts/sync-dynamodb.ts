#!/usr/bin/env tsx
/**
 * DynamoDB Sync Script
 *
 * This script syncs ALL local DynamoDB tables to remote AWS tables.
 * Handles: local-users → users-dev, local-events → events-dev
 *
 * Usage:
 *   pnpm sync:compare          # Compare all tables
 *   pnpm sync:all              # Sync all tables to remote
 *   pnpm sync:recreate         # Recreate all remote tables (DESTRUCTIVE)
 */

import { DynamoDBClient, ListTablesCommand, DescribeTableCommand, CreateTableCommand, DeleteTableCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand as DocScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.production' });

// Configuration
const LOCAL_ENDPOINT = 'http://localhost:8000';
const TABLES = [
  { local: 'local-users', remote: 'users-dev', keyAttr: 'userId' },
  { local: 'local-events', remote: 'events-dev', keyAttr: 'eventId' },
];

// Create clients
const localClient = new DynamoDBClient({
  endpoint: LOCAL_ENDPOINT,
  region: 'us-east-1',
  credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' },
});

const remoteClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
  } : undefined,
});

const localDocClient = DynamoDBDocumentClient.from(localClient);
const remoteDocClient = DynamoDBDocumentClient.from(remoteClient);

// Parse args
const args = process.argv.slice(2);
const compareOnly = args.includes('--compare');
const recreateAll = args.includes('--recreate');

// Helper: Check if table exists
async function tableExists(client: DynamoDBClient, tableName: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch {
    return false;
  }
}

// Helper: Get table schema
async function getTableSchema(client: DynamoDBClient, tableName: string) {
  try {
    const response = await client.send(new DescribeTableCommand({ TableName: tableName }));
    return response.Table;
  } catch {
    return null;
  }
}

// Helper: Scan all items
async function scanAllItems(docClient: DynamoDBDocumentClient, tableName: string) {
  const items: any[] = [];
  let lastKey: any = undefined;

  do {
    const response = await docClient.send(new DocScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastKey,
    }));

    if (response.Items) {
      items.push(...response.Items);
    }
    lastKey = response.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

// Helper: Create table from schema
async function createTable(client: DynamoDBClient, sourceSchema: any, targetName: string) {
  await client.send(new CreateTableCommand({
    TableName: targetName,
    KeySchema: sourceSchema.KeySchema,
    AttributeDefinitions: sourceSchema.AttributeDefinitions,
    BillingMode: 'PAY_PER_REQUEST',
    ...(sourceSchema.GlobalSecondaryIndexes && {
      GlobalSecondaryIndexes: sourceSchema.GlobalSecondaryIndexes.map((gsi: any) => ({
        IndexName: gsi.IndexName,
        KeySchema: gsi.KeySchema,
        Projection: gsi.Projection,
      })),
    }),
  }));

  // Wait for table to be active
  let active = false;
  while (!active) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const desc = await client.send(new DescribeTableCommand({ TableName: targetName }));
    active = desc.Table?.TableStatus === 'ACTIVE';
  }
}

// Helper: Delete table
async function deleteTable(client: DynamoDBClient, tableName: string) {
  await client.send(new DeleteTableCommand({ TableName: tableName }));

  // Wait for table to be deleted
  let exists = true;
  while (exists) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    exists = await tableExists(client, tableName);
  }
}

// Helper: Import items in batches
async function importItems(docClient: DynamoDBDocumentClient, tableName: string, items: any[]) {
  const batches = [];
  for (let i = 0; i < items.length; i += 25) {
    batches.push(items.slice(i, i + 25));
  }

  let imported = 0;
  for (const batch of batches) {
    await docClient.send(new BatchWriteCommand({
      RequestItems: {
        [tableName]: batch.map(item => ({ PutRequest: { Item: item } })),
      },
    }));
    imported += batch.length;
    process.stdout.write(`\r  Imported ${imported}/${items.length} items...`);
  }
  console.log('');
}

// Main sync logic for one table
async function syncTable(table: typeof TABLES[0]) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${table.local} → ${table.remote}`);
  console.log('='.repeat(60));

  // Check local table
  const localExists = await tableExists(localClient, table.local);
  if (!localExists) {
    console.log(`❌ Local table ${table.local} not found`);
    return;
  }

  const localSchema = await getTableSchema(localClient, table.local);
  const localItems = await scanAllItems(localDocClient, table.local);
  console.log(`✓ Local: ${localItems.length} items`);

  // Check remote table
  const remoteExists = await tableExists(remoteClient, table.remote);

  if (compareOnly) {
    if (!remoteExists) {
      console.log(`⚠️  Remote table ${table.remote} does not exist`);
    } else {
      const remoteSchema = await getTableSchema(remoteClient, table.remote);
      const remoteItems = await scanAllItems(remoteDocClient, table.remote);
      console.log(`✓ Remote: ${remoteItems.length} items`);

      const schemasMatch = JSON.stringify(localSchema?.KeySchema) === JSON.stringify(remoteSchema?.KeySchema);
      console.log(schemasMatch ? '✅ Schemas match' : '⚠️  Schemas differ');
    }
    return;
  }

  // Recreate or create table
  if (recreateAll) {
    if (remoteExists) {
      console.log(`🗑️  Deleting remote table ${table.remote}...`);
      await deleteTable(remoteClient, table.remote);
    }
  }

  if (!remoteExists || recreateAll) {
    console.log(`🔨 Creating remote table ${table.remote}...`);
    await createTable(remoteClient, localSchema, table.remote);
  }

  // Import data
  console.log(`📤 Syncing ${localItems.length} items to ${table.remote}...`);
  await importItems(remoteDocClient, table.remote, localItems);
  console.log(`✅ Successfully synced ${table.remote}`);
}

// Main
async function main() {
  console.log('\n🚀 Multi-Table DynamoDB Sync\n');
  console.log(`Local:  ${LOCAL_ENDPOINT}`);
  console.log(`Remote: ${process.env.AWS_REGION || 'us-east-2'}`);
  console.log(`Mode:   ${compareOnly ? 'COMPARE' : recreateAll ? 'RECREATE' : 'SYNC'}\n`);

  if (recreateAll && !compareOnly) {
    console.log('⚠️  WARNING: RECREATE mode will DELETE all remote tables!');
    console.log('Starting in 5 seconds... (Ctrl+C to cancel)\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  try {
    for (const table of TABLES) {
      await syncTable(table);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ All tables processed successfully!');
    console.log('='.repeat(60));
    console.log('');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
