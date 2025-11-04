import { CreateTableCommand, DeleteTableCommand, DescribeTableCommand, ListTablesCommand, ResourceNotFoundException } from "@aws-sdk/client-dynamodb";
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
}

// Table schemas for the application
export const TABLE_SCHEMAS: TableSchema[] = [
  {
    tableName: 'users',
    keySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' }
    ],
    attributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' }
    ]
  },
  {
    tableName: 'events',
    keySchema: [
      { AttributeName: 'eventId', KeyType: 'HASH' }
    ],
    attributeDefinitions: [
      { AttributeName: 'eventId', AttributeType: 'S' }
    ]
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
        results.success.push(schema.tableName);
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