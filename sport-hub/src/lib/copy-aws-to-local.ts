#!/usr/bin/env node
/**
 * Copy isa-users and ISA-Rankings tables from AWS to local DynamoDB
 *
 * This is a one-time script to avoid AWS connectivity issues during export
 */

import { DynamoDBClient, CreateTableCommand, DeleteTableCommand, DescribeTableCommand, TableDescription, GlobalSecondaryIndexDescription, LocalSecondaryIndexDescription } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand, ScanCommandInput } from "@aws-sdk/lib-dynamodb";

// Type for DynamoDB items
type DynamoDBItem = Record<string, unknown>;

// AWS configuration - uncomment and configure for actual AWS copy
const AWS_REGION = process.env.AWS_REGION || 'eu-central-1';
const awsClient = new DynamoDBClient({
  region: AWS_REGION,
  maxAttempts: 3,
});

// Local DynamoDB configuration
const localClient = new DynamoDBClient({
  region: 'us-east-2',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
});
const localDdb = DynamoDBDocumentClient.from(localClient);
const awsDdb = DynamoDBDocumentClient.from(awsClient);

/**
 * Get table schema from AWS
 */
async function getTableSchema(tableName: string): Promise<TableDescription | undefined> {
  console.log(`📋 Getting schema for ${tableName}...`);

  const command = new DescribeTableCommand({ TableName: tableName });
  const response = await awsClient.send(command);

  return response.Table;
}

/**
 * Create table in local DynamoDB with same schema as AWS
 */
async function createLocalTable(tableName: string, schema: TableDescription) {
  console.log(`🔨 Creating local table ${tableName}...`);

  try {
    // Try to delete existing table first
    await localClient.send(new DeleteTableCommand({ TableName: tableName }));
    console.log(`   🗑️  Deleted existing table`);
    // Wait a bit for deletion to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error: unknown) {
    if (error instanceof Error && error.name !== 'ResourceNotFoundException') {
      throw error;
    }
  }

  const createCommand = new CreateTableCommand({
    TableName: tableName,
    KeySchema: schema.KeySchema,
    AttributeDefinitions: schema.AttributeDefinitions,
    BillingMode: 'PAY_PER_REQUEST',
    GlobalSecondaryIndexes: schema.GlobalSecondaryIndexes?.map((gsi: GlobalSecondaryIndexDescription) => ({
      IndexName: gsi.IndexName,
      KeySchema: gsi.KeySchema,
      Projection: gsi.Projection,
    })),
    LocalSecondaryIndexes: schema.LocalSecondaryIndexes?.map((lsi: LocalSecondaryIndexDescription) => ({
      IndexName: lsi.IndexName,
      KeySchema: lsi.KeySchema,
      Projection: lsi.Projection,
    })),
  });

  await localClient.send(createCommand);
  console.log(`✅ Created local table ${tableName}`);

  // Wait for table to be active
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Scan all items from AWS table
 */
async function scanAWSTable(tableName: string): Promise<DynamoDBItem[]> {
  console.log(`📥 Scanning AWS table ${tableName}...`);

  const items: DynamoDBItem[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;
  let scannedCount = 0;

  do {
    const scanParams: ScanCommandInput = {
      TableName: tableName,
      ExclusiveStartKey: lastEvaluatedKey,
    };
    const response = await awsDdb.send(new ScanCommand(scanParams));

    if (response.Items) {
      items.push(...response.Items);
      scannedCount += response.Items.length;

      if (scannedCount % 100 === 0) {
        console.log(`   📝 Scanned ${scannedCount} items...`);
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`✅ Scanned ${items.length} total items from ${tableName}`);
  return items;
}

/**
 * Batch write items to local DynamoDB
 */
async function batchWriteToLocal(tableName: string, items: DynamoDBItem[]) {
  console.log(`📤 Writing ${items.length} items to local ${tableName}...`);

  const BATCH_SIZE = 25; // DynamoDB batch write limit
  let writtenCount = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: batch.map(item => ({
          PutRequest: {
            Item: item,
          },
        })),
      },
    });

    await localDdb.send(command);
    writtenCount += batch.length;

    if (writtenCount % 100 === 0) {
      console.log(`   ✍️  Written ${writtenCount} items...`);
    }
  }

  console.log(`✅ Written ${items.length} items to local ${tableName}`);
}

/**
 * Copy a table from AWS to local
 */
async function copyTable(tableName: string) {
  console.log(`\n🚀 Copying ${tableName} from AWS to local...`);

  // Get schema from AWS
  const schema = await getTableSchema(tableName);
  if (!schema) {
    throw new Error(`Could not get schema for table ${tableName}`);
  }

  // Create table locally with same schema
  await createLocalTable(tableName, schema);

  // Scan all items from AWS
  const items = await scanAWSTable(tableName);

  // Write items to local
  await batchWriteToLocal(tableName, items);

  console.log(`✅ ${tableName} copied successfully!\n`);
}

/**
 * Main function
 */
async function main() {
  console.log('🎯 Starting AWS to Local DynamoDB copy...\n');

  try {
    // Copy both tables
    await copyTable('isa-users');
    await copyTable('ISA-Rankings');

    console.log('✅ All tables copied successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update export script to use local endpoint');
    console.log('   2. Run: pnpm tsx src/lib/export-from-isa-rankings.ts');

  } catch (error) {
    console.error('❌ Copy failed:', error);
    process.exit(1);
  }
}

main();
