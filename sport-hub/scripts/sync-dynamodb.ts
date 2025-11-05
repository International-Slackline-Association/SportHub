#!/usr/bin/env ts-node
/**
 * DynamoDB Sync Script
 *
 * This script syncs your local DynamoDB table to the remote AWS table.
 * It handles both schema (table structure) and data migration.
 *
 * Usage:
 *   # Compare local vs remote schemas
 *   pnpm sync:compare
 *
 *   # Export local data to files
 *   pnpm sync:export
 *
 *   # Import local data to remote
 *   pnpm sync:import
 *
 *   # Delete and recreate remote table (DESTRUCTIVE)
 *   pnpm sync:recreate
 *
 * See docs/DATABASE-SYNC.md for detailed documentation.
 */

import { DynamoDBClient, DescribeTableCommand, CreateTableCommand, DeleteTableCommand, BatchWriteItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand as DocScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

// Load environment variables from .env.production
config({ path: '.env.production' });

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const LOCAL_ENDPOINT = 'http://localhost:8000';
const LOCAL_TABLE = 'local-rankings';
const REMOTE_TABLE = process.env.DYNAMODB_TABLE_NAME || 'rankings-dev';
const EXPORT_DIR = path.join(__dirname, '../data-exports');

// Create clients
const localClient = new DynamoDBClient({
  endpoint: LOCAL_ENDPOINT,
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
});

// Debug: Check credentials
console.log('🔍 Debug - Credentials check:');
console.log('  AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'NOT SET');
console.log('  AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? `${process.env.AWS_SECRET_ACCESS_KEY.substring(0, 8)}...` : 'NOT SET');
console.log('  AWS_SESSION_TOKEN:', process.env.AWS_SESSION_TOKEN ? `${process.env.AWS_SESSION_TOKEN.substring(0, 20)}...` : 'NOT SET');
console.log('  AWS_REGION:', process.env.AWS_REGION || 'us-east-1');
console.log('');

const remoteClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN }),
  } : undefined,
});

const localDocClient = DynamoDBDocumentClient.from(localClient);
const remoteDocClient = DynamoDBDocumentClient.from(remoteClient);

// Parse command line args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const exportOnly = args.includes('--export');
const syncData = args.includes('--sync');
const recreateTable = args.includes('--recreate');

async function describeTable(client: DynamoDBClient, tableName: string) {
  try {
    const response = await client.send(new DescribeTableCommand({ TableName: tableName }));
    return response.Table;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return null;
    }
    throw error;
  }
}

async function exportTableSchema(tableName: string) {
  console.log(`📋 Exporting schema for table: ${tableName}`);

  const tableDescription = await describeTable(localClient, tableName);
  if (!tableDescription) {
    throw new Error(`Table ${tableName} not found in local DynamoDB`);
  }

  // Extract only the necessary fields for CreateTable
  const schema = {
    TableName: REMOTE_TABLE, // Use remote table name
    KeySchema: tableDescription.KeySchema,
    AttributeDefinitions: tableDescription.AttributeDefinitions,
    BillingMode: 'PAY_PER_REQUEST', // Use on-demand pricing for flexibility
    GlobalSecondaryIndexes: tableDescription.GlobalSecondaryIndexes?.map(gsi => ({
      IndexName: gsi.IndexName,
      KeySchema: gsi.KeySchema,
      Projection: gsi.Projection,
    })),
    LocalSecondaryIndexes: tableDescription.LocalSecondaryIndexes?.map(lsi => ({
      IndexName: lsi.IndexName,
      KeySchema: lsi.KeySchema,
      Projection: lsi.Projection,
    })),
    StreamSpecification: tableDescription.StreamSpecification,
  };

  // Remove undefined fields
  Object.keys(schema).forEach(key => {
    if (schema[key as keyof typeof schema] === undefined) {
      delete schema[key as keyof typeof schema];
    }
  });

  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  const schemaPath = path.join(EXPORT_DIR, 'table-schema.json');
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
  console.log(`✅ Schema exported to: ${schemaPath}`);

  return schema;
}

async function exportTableData(tableName: string) {
  console.log(`📦 Exporting data from table: ${tableName}`);

  let items: any[] = [];
  let lastEvaluatedKey: any = undefined;
  let itemCount = 0;

  do {
    const params: any = {
      TableName: tableName,
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const response = await localDocClient.send(new DocScanCommand(params));

    if (response.Items) {
      items = items.concat(response.Items);
      itemCount += response.Items.length;
      process.stdout.write(`\r  Exported ${itemCount} items...`);
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`\n✅ Exported ${items.length} items total`);

  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }

  const dataPath = path.join(EXPORT_DIR, 'table-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(items, null, 2));
  console.log(`✅ Data exported to: ${dataPath}`);

  return items;
}

async function createRemoteTable(schema: any) {
  console.log(`🏗️  Creating remote table: ${REMOTE_TABLE}`);

  if (dryRun) {
    console.log('   [DRY RUN] Would create table with schema:');
    console.log(JSON.stringify(schema, null, 2));
    return;
  }

  try {
    await remoteClient.send(new CreateTableCommand(schema));
    console.log(`✅ Table ${REMOTE_TABLE} created successfully`);

    // Wait for table to be active
    console.log('   Waiting for table to become active...');
    let isActive = false;
    while (!isActive) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const table = await describeTable(remoteClient, REMOTE_TABLE);
      isActive = table?.TableStatus === 'ACTIVE';
      process.stdout.write('.');
    }
    console.log('\n✅ Table is now active');
  } catch (error: any) {
    if (error.name === 'ResourceInUseException') {
      console.log(`⚠️  Table ${REMOTE_TABLE} already exists`);
    } else {
      throw error;
    }
  }
}

async function deleteRemoteTable() {
  console.log(`🗑️  Deleting remote table: ${REMOTE_TABLE}`);

  if (dryRun) {
    console.log('   [DRY RUN] Would delete table');
    return;
  }

  try {
    await remoteClient.send(new DeleteTableCommand({ TableName: REMOTE_TABLE }));
    console.log(`✅ Table ${REMOTE_TABLE} deleted`);

    // Wait for table to be deleted
    console.log('   Waiting for table deletion...');
    let exists = true;
    while (exists) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const table = await describeTable(remoteClient, REMOTE_TABLE);
      exists = table !== null;
      process.stdout.write('.');
    }
    console.log('\n✅ Table deleted');
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`⚠️  Table ${REMOTE_TABLE} does not exist`);
    } else {
      throw error;
    }
  }
}

async function importDataToRemote(items: any[]) {
  console.log(`📤 Importing ${items.length} items to remote table: ${REMOTE_TABLE}`);

  if (dryRun) {
    console.log('   [DRY RUN] Would import items');
    return;
  }

  // DynamoDB batch write limit is 25 items per request
  const BATCH_SIZE = 25;
  const batches = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    batches.push(items.slice(i, i + BATCH_SIZE));
  }

  console.log(`   Processing ${batches.length} batches...`);

  let processedCount = 0;
  for (const batch of batches) {
    const putRequests = batch.map(item => ({
      PutRequest: { Item: item }
    }));

    try {
      await remoteDocClient.send(new BatchWriteCommand({
        RequestItems: {
          [REMOTE_TABLE]: putRequests
        }
      }));
      processedCount += batch.length;
      process.stdout.write(`\r  Imported ${processedCount}/${items.length} items...`);
    } catch (error) {
      console.error(`\n❌ Error importing batch:`, error);
      throw error;
    }
  }

  console.log(`\n✅ Successfully imported ${processedCount} items`);
}

async function compareSchemas() {
  console.log('🔍 Comparing local and remote table schemas...\n');

  const localTable = await describeTable(localClient, LOCAL_TABLE);
  const remoteTable = await describeTable(remoteClient, REMOTE_TABLE);

  if (!localTable) {
    console.log('❌ Local table not found');
    return;
  }

  console.log('Local Table:');
  console.log(`  Keys: ${JSON.stringify(localTable.KeySchema)}`);
  console.log(`  Attributes: ${JSON.stringify(localTable.AttributeDefinitions)}`);
  console.log(`  GSIs: ${localTable.GlobalSecondaryIndexes?.length || 0}`);

  if (!remoteTable) {
    console.log('\n⚠️  Remote table does not exist\n');
    return;
  }

  console.log('\nRemote Table:');
  console.log(`  Keys: ${JSON.stringify(remoteTable.KeySchema)}`);
  console.log(`  Attributes: ${JSON.stringify(remoteTable.AttributeDefinitions)}`);
  console.log(`  GSIs: ${remoteTable.GlobalSecondaryIndexes?.length || 0}`);

  const schemasMatch =
    JSON.stringify(localTable.KeySchema) === JSON.stringify(remoteTable.KeySchema) &&
    JSON.stringify(localTable.AttributeDefinitions) === JSON.stringify(remoteTable.AttributeDefinitions);

  console.log(`\n${schemasMatch ? '✅' : '⚠️'} Schemas ${schemasMatch ? 'match' : 'differ'}\n`);
}

async function main() {
  console.log('\n🚀 DynamoDB Sync Tool\n');
  console.log(`Local:  ${LOCAL_TABLE} (${LOCAL_ENDPOINT})`);
  console.log(`Remote: ${REMOTE_TABLE} (${process.env.AWS_REGION || 'us-east-1'})\n`);

  try {
    // Always show comparison
    await compareSchemas();

    if (recreateTable) {
      console.log('\n⚠️  RECREATE MODE - This will DELETE and RECREATE the remote table!\n');
      if (!dryRun) {
        // Give user 5 seconds to cancel
        console.log('Starting in 5 seconds... (Ctrl+C to cancel)');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      await deleteRemoteTable();
      const schema = await exportTableSchema(LOCAL_TABLE);
      await createRemoteTable(schema);
      const items = await exportTableData(LOCAL_TABLE);
      await importDataToRemote(items);
    } else if (syncData) {
      console.log('\n📥 SYNC MODE - Exporting and importing data\n');
      const items = await exportTableData(LOCAL_TABLE);
      await importDataToRemote(items);
    } else if (exportOnly) {
      console.log('\n📤 EXPORT MODE - Exporting schema and data only\n');
      await exportTableSchema(LOCAL_TABLE);
      await exportTableData(LOCAL_TABLE);
    } else {
      console.log('ℹ️  No action specified. Use the appropriate pnpm command:\n');
      console.log('Examples:');
      console.log('  pnpm sync:compare               # Compare local and remote schemas');
      console.log('  pnpm sync:export                # Export local data to files');
      console.log('  pnpm sync:import                # Import data to remote');
      console.log('  pnpm sync:recreate              # Recreate remote table');
      console.log('  tsx scripts/sync-dynamodb.ts --dry-run --sync   # Advanced: Preview sync\n');
    }

    console.log('\n✅ Done!\n');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly (ES module version)
// In ES modules, check if this file is the entry point
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}
