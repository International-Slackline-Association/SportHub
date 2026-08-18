import { CreateTableCommand, DeleteTableCommand, DescribeTableCommand, ListTablesCommand, ResourceNotFoundException, UpdateTableCommand } from "@aws-sdk/client-dynamodb";
import { dynamoClient, getTableName } from "./dynamodb";

export interface TableSchema {
  tableName: string;
  keySchema: Array<{
    AttributeName: string;
    KeyType: 'HASH' | 'RANGE';
  }>;
  attributeDefinitions: Array<{
    AttributeName: string;
    AttributeType: 'S' | 'N' | 'B';
  }>;
  globalSecondaryIndexes?: Array<{
    IndexName: string;
    KeySchema: Array<{
      AttributeName: string;
      KeyType: 'HASH' | 'RANGE';
    }>;
    Projection: {
      ProjectionType: 'ALL' | 'KEYS_ONLY' | 'INCLUDE';
      NonKeyAttributes?: string[];
    };
  }>;
}

// Table schemas for the application
export const TABLE_SCHEMAS: TableSchema[] = [
  // Users table with composite sort key and GSI for rankings
  {
    tableName: 'sporthub-users',
    keySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },
      { AttributeName: 'sortKey', KeyType: 'RANGE' }  // Profile, Ranking:*, Participation:*
    ],
    attributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
      { AttributeName: 'sortKey', AttributeType: 'S' },
      { AttributeName: 'primarySubType', AttributeType: 'S' },
      { AttributeName: 'totalPoints', AttributeType: 'N' },
      { AttributeName: 'discipline', AttributeType: 'S' },    // For discipline-rankings-index
      { AttributeName: 'gsiSortKey', AttributeType: 'S' },     // For sorting: points#userId
      { AttributeName: 'athleteSlug', AttributeType: 'S' },    // For athleteSlug-index
    ],
    globalSecondaryIndexes: [
      {
        IndexName: 'userSubType-index',
        KeySchema: [
          { AttributeName: 'primarySubType', KeyType: 'HASH' },
          { AttributeName: 'totalPoints', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'discipline-rankings-index',
        KeySchema: [
          { AttributeName: 'discipline', KeyType: 'HASH' },
          { AttributeName: 'gsiSortKey', KeyType: 'RANGE' },  // Format: points#userId
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'athleteSlug-index',
        KeySchema: [
          { AttributeName: 'athleteSlug', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  // Events table with composite key for Event → Contest hierarchy
  {
    tableName: 'sporthub-events',
    keySchema: [
      { AttributeName: 'eventId', KeyType: 'HASH' },  // PK
      { AttributeName: 'sortKey', KeyType: 'RANGE' }, // SK: "Metadata" or "Contest:{discipline}:{contestId}"
    ],
    attributeDefinitions: [
      { AttributeName: 'eventId', AttributeType: 'S' },
      { AttributeName: 'sortKey', AttributeType: 'S' },
      { AttributeName: 'contestId', AttributeType: 'S' },     // For contestId-index
      { AttributeName: 'discipline', AttributeType: 'S' },    // For date-discipline-index
      { AttributeName: 'dateSortKey', AttributeType: 'S' },   // For sorting: contestDate#eventId
    ],
    globalSecondaryIndexes: [
      {
        IndexName: 'contestId-index',
        KeySchema: [
          { AttributeName: 'contestId', KeyType: 'HASH' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        IndexName: 'date-discipline-index',
        KeySchema: [
          { AttributeName: 'discipline', KeyType: 'HASH' },
          { AttributeName: 'dateSortKey', KeyType: 'RANGE' },  // Format: contestDate#eventId
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  }
];

export class DatabaseSetup {

  async createTable(schema: TableSchema): Promise<boolean> {
    try {
      const tableName = getTableName(schema.tableName);

      const command = new CreateTableCommand({
        TableName: tableName,
        KeySchema: schema.keySchema,
        AttributeDefinitions: schema.attributeDefinitions,
        BillingMode: 'PAY_PER_REQUEST', // On-demand pricing
        // Add GSI support
        ...(schema.globalSecondaryIndexes && {
          GlobalSecondaryIndexes: schema.globalSecondaryIndexes.map(gsi => ({
            IndexName: gsi.IndexName,
            KeySchema: gsi.KeySchema,
            Projection: gsi.Projection,
          })),
        }),
      });

      await dynamoClient.send(command);

      // Wait for table to be active
      await this.waitForTable(tableName);

      console.log(`✅ Table ${tableName} created successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error creating table ${schema.tableName}:`, error);
      return false;
    }
  }

  async deleteTable(tableName: string): Promise<boolean> {
    const fullTableName = getTableName(tableName);

    try {
      const command = new DeleteTableCommand({
        TableName: fullTableName,
      });

      await dynamoClient.send(command);
      console.log(`🗑️ Table ${fullTableName} deleted successfully`);
      return true;
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        console.log(`ℹ️ Table ${fullTableName} does not exist`);
        return true;
      }
      console.error(`❌ Error deleting table ${tableName}:`, error);
      return false;
    }
  }

  async tableExists(tableName: string): Promise<boolean> {
    try {
      const fullTableName = getTableName(tableName);

      const command = new DescribeTableCommand({
        TableName: fullTableName,
      });

      const response = await dynamoClient.send(command);
      return response.Table?.TableStatus === 'ACTIVE';
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        return false;
      }
      console.error(`❌ Error checking table ${tableName}:`, error);
      return false;
    }
  }

  async listTables(): Promise<string[]> {
    try {
      const command = new ListTablesCommand({});
      const response = await dynamoClient.send(command);
      return response.TableNames || [];
    } catch (error) {
      console.error('❌ Error listing tables:', error);
      return [];
    }
  }

  async waitForTable(tableName: string, maxWaitTime = 30000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const command = new DescribeTableCommand({ TableName: tableName });
        const response = await dynamoClient.send(command);

        if (response.Table?.TableStatus === 'ACTIVE') {
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        if (error instanceof ResourceNotFoundException) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw error;
      }
    }

    throw new Error(`Table ${tableName} did not become active within ${maxWaitTime}ms`);
  }

  async waitForIndexActive(tableName: string, indexName: string, maxWaitTime = 5 * 60000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const response = await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
      const gsi = response.Table?.GlobalSecondaryIndexes?.find(g => g.IndexName === indexName);

      if (gsi?.IndexStatus === 'ACTIVE') {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error(`Index ${indexName} on ${tableName} did not become active within ${maxWaitTime}ms`);
  }

  /**
   * For a table that already exists, compares its live GlobalSecondaryIndexes
   * against what TABLE_SCHEMAS declares and creates whatever's missing.
   *
   * createTable() only runs for brand-new tables, so a schema change (a new
   * GSI added to TABLE_SCHEMAS) silently does nothing for any environment
   * whose table predates that change — createAllTables() would just log
   * "already exists" and move on, leaving the table missing an index the
   * app expects at query time. This closes that gap.
   *
   * DynamoDB only allows one GSI to be in CREATING state per table at a
   * time, so missing indexes are added sequentially, each waited out before
   * starting the next.
   */
  async reconcileIndexes(schema: TableSchema): Promise<{ added: string[]; failed: string[] }> {
    const tableName = getTableName(schema.tableName);
    const added: string[] = [];
    const failed: string[] = [];

    if (!schema.globalSecondaryIndexes?.length) {
      return { added, failed };
    }

    const describe = await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
    const existingIndexNames = new Set(
      (describe.Table?.GlobalSecondaryIndexes ?? []).map(gsi => gsi.IndexName)
    );

    const missing = schema.globalSecondaryIndexes.filter(gsi => !existingIndexNames.has(gsi.IndexName));
    if (missing.length === 0) {
      return { added, failed };
    }

    console.warn(
      `⚠️  ${tableName} is missing ${missing.length} index(es) declared in TABLE_SCHEMAS: ` +
      `${missing.map(g => g.IndexName).join(', ')}. This happens when the table was created ` +
      `before these indexes were added to the schema. Adding them now.`
    );

    for (const gsi of missing) {
      try {
        const neededAttributeNames = new Set(gsi.KeySchema.map(k => k.AttributeName));
        const attributeDefinitions = schema.attributeDefinitions.filter(
          attr => neededAttributeNames.has(attr.AttributeName)
        );

        console.log(`   🚀 Adding ${gsi.IndexName} to ${tableName}...`);
        await dynamoClient.send(new UpdateTableCommand({
          TableName: tableName,
          AttributeDefinitions: attributeDefinitions,
          GlobalSecondaryIndexUpdates: [{ Create: gsi }],
        }));

        console.log(`   ⏳ Waiting for ${gsi.IndexName} to become active (can take a few minutes on AWS)...`);
        await this.waitForIndexActive(tableName, gsi.IndexName);
        console.log(`   ✅ ${gsi.IndexName} is active`);
        added.push(gsi.IndexName);
      } catch (error) {
        console.error(`   ❌ Failed to add ${gsi.IndexName} to ${tableName}:`, error);
        failed.push(gsi.IndexName);
      }
    }

    return { added, failed };
  }

  async createAllTables(): Promise<{ success: string[]; failed: string[] }> {
    console.log('🚀 Creating all tables...');

    const results = {
      success: [] as string[],
      failed: [] as string[]
    };

    for (const schema of TABLE_SCHEMAS) {
      const exists = await this.tableExists(schema.tableName);
      if (exists) {
        console.log(`ℹ️ Table ${getTableName(schema.tableName)} already exists`);
        const { failed: failedIndexes } = await this.reconcileIndexes(schema);
        if (failedIndexes.length > 0) {
          results.failed.push(schema.tableName);
        } else {
          results.success.push(schema.tableName);
        }
        continue;
      }

      const created = await this.createTable(schema);
      if (created) {
        results.success.push(schema.tableName);
      } else {
        results.failed.push(schema.tableName);
      }
    }

    return results;
  }

  async deleteAllTables(): Promise<{ success: string[]; failed: string[] }> {
    console.log('🗑️ Deleting all tables...');

    const results = {
      success: [] as string[],
      failed: [] as string[]
    };

    for (const schema of TABLE_SCHEMAS) {
      const deleted = await this.deleteTable(schema.tableName);
      if (deleted) {
        results.success.push(schema.tableName);
      } else {
        results.failed.push(schema.tableName);
      }
    }

    return results;
  }

  async getTableStatus(): Promise<Record<string, string>> {
    const status: Record<string, string> = {};

    for (const schema of TABLE_SCHEMAS) {
      const fullTableName = getTableName(schema.tableName);
      try {
        const command = new DescribeTableCommand({ TableName: fullTableName });
        const response = await dynamoClient.send(command);
        status[fullTableName] = response.Table?.TableStatus || 'UNKNOWN';
      } catch (error) {
        if (error instanceof ResourceNotFoundException) {
          status[fullTableName] = 'NOT_FOUND';
        } else {
          status[fullTableName] = 'ERROR';
        }
      }
    }

    return status;
  }
}

// CLI entry point - only run when executed directly (not when imported as a module)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const setup = new DatabaseSetup();
  setup.createAllTables().then(results => {
    if (results.failed.length > 0) {
      console.error('❌ Failed tables:', results.failed.join(', '));
      process.exit(1);
    }
    console.log('✅ All tables ready:', results.success.map(t => getTableName(t)).join(', '));
    process.exit(0);
  });
}