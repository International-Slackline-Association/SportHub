import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand, UpdateCommand, QueryCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";

// Environment detection for local development
const isLocal = process.env.DYNAMODB_LOCAL === 'true';

// DEBUG: Log environment variables (uncomment when debugging)
// console.log('🐛 DynamoDB Environment Debug:');
// console.log('  DYNAMODB_LOCAL:', process.env.DYNAMODB_LOCAL);
// console.log('  DYNAMODB_ENDPOINT:', process.env.DYNAMODB_ENDPOINT);
// console.log('  NODE_ENV:', process.env.NODE_ENV);
// console.log('  AWS_REGION:', process.env.AWS_REGION);
// console.log('  isLocal:', isLocal);

// TODO: Set up AWS Cognito authentication(?)
// TODO: Set up Amplify role for all server-side AWS actions (like dynamodb access)
const clientConfig = {
  region: process.env.AWS_REGION || "us-east-2",
  // PERFORMANCE OPTIMIZATION: Configure connection pooling
  maxAttempts: 3,
  requestHandler: {
    httpsAgent: {
      maxSockets: 25, // Reduce from default 50 to prevent socket exhaustion
      keepAlive: true,
      keepAliveMsecs: 1000,
    },
    connectionTimeout: 2000,
    requestTimeout: 5000,
  },
  ...(isLocal ? {
    endpoint: process.env.DYNAMODB_ENDPOINT || "http://localhost:8000",
    credentials: {
      accessKeyId: "dummy",
      secretAccessKey: "dummy",
    },
  } : {})
  // AWS SDK will automatically use credentials from environment variables in production
  // logger: console, // TODO: DEBUG ONLY
};

// console.log('🐛 DynamoDB Client Config:', JSON.stringify(clientConfig, null, 2));

const client = new DynamoDBClient(clientConfig);

const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true, // Remove undefined values instead of throwing errors
    convertClassInstanceToMap: true,
  },
});

// Table name helpers for different environments
export const getTableName = (baseName: string) => {
  // For local DynamoDB (docker), use local- prefix
  if (isLocal) return `local-${baseName}`;
  // For everything else (AWS), always use -dev suffix
  // This ensures we never touch production tables
  return `${baseName}-dev`;
};

// Update options interface for atomic updates
export interface UpdateOptions {
  updateExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, unknown>;
  conditionExpression?: string;
  returnValues?: 'NONE' | 'ALL_OLD' | 'UPDATED_OLD' | 'ALL_NEW' | 'UPDATED_NEW';
}

export const dynamodb = {
  // Create/Update item
  async putItem(tableName: string, item: Record<string, unknown>) {
    const command = new PutCommand({
      TableName: getTableName(tableName),
      Item: item,
    });
    return await ddb.send(command);
  },

  // Get item by key
  async getItem(tableName: string, key: Record<string, unknown>) {
    const command = new GetCommand({
      TableName: getTableName(tableName),
      Key: key,
    });
    const response = await ddb.send(command);
    return response.Item;
  },

  // Scan all items (with optional limit, projection, and filtering for efficiency)
  // Handles pagination automatically - DynamoDB returns max 1MB per request
  async scanItems(tableName: string, options?: {
    limit?: number;
    projectionExpression?: string;
    expressionAttributeNames?: Record<string, string>;
    filterExpression?: string;
    expressionAttributeValues?: Record<string, unknown>;
  }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allItems: any[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const command = new ScanCommand({
        TableName: getTableName(tableName),
        ExclusiveStartKey: lastEvaluatedKey,
        ...(options?.projectionExpression && { ProjectionExpression: options.projectionExpression }),
        ...(options?.expressionAttributeNames && { ExpressionAttributeNames: options.expressionAttributeNames }),
        ...(options?.filterExpression && { FilterExpression: options.filterExpression }),
        ...(options?.expressionAttributeValues && { ExpressionAttributeValues: options.expressionAttributeValues }),
      });

      const response = await ddb.send(command);
      if (response.Items) {
        allItems.push(...response.Items);
      }
      lastEvaluatedKey = response.LastEvaluatedKey;

      // If user specified a limit, stop once we have enough items
      if (options?.limit && allItems.length >= options.limit) {
        return allItems.slice(0, options.limit);
      }
    } while (lastEvaluatedKey);

    return allItems;
  },

  // Paginated scan - returns items and cursor for next page
  // Use this instead of scanItems when you need pagination control
  // Note: When using filterExpression, this keeps fetching until limit is reached
  // because DynamoDB applies Limit BEFORE filtering
  async scanItemsPaginated(tableName: string, options?: {
    limit?: number;
    exclusiveStartKey?: Record<string, unknown>;
    projectionExpression?: string;
    expressionAttributeNames?: Record<string, string>;
    filterExpression?: string;
    expressionAttributeValues?: Record<string, unknown>;
  }): Promise<{
    items: Record<string, unknown>[];
    lastEvaluatedKey?: Record<string, unknown>;
    hasMore: boolean;
  }> {
    const collectedItems: Record<string, unknown>[] = [];
    let lastKey = options?.exclusiveStartKey;
    const targetLimit = options?.limit || 100;

    // Keep fetching until we have enough filtered items or no more data
    do {
      const command = new ScanCommand({
        TableName: getTableName(tableName),
        ExclusiveStartKey: lastKey,
        ...(options?.projectionExpression && { ProjectionExpression: options.projectionExpression }),
        ...(options?.expressionAttributeNames && { ExpressionAttributeNames: options.expressionAttributeNames }),
        ...(options?.filterExpression && { FilterExpression: options.filterExpression }),
        ...(options?.expressionAttributeValues && { ExpressionAttributeValues: options.expressionAttributeValues }),
      });

      const response = await ddb.send(command);
      if (response.Items) {
        collectedItems.push(...response.Items);
      }
      lastKey = response.LastEvaluatedKey;

      // Stop if we have enough items or no more pages
      if (collectedItems.length >= targetLimit || !lastKey) {
        break;
      }
    } while (lastKey);

    // Return exactly the requested limit
    const items = collectedItems.slice(0, targetLimit);
    const hasMore = collectedItems.length > targetLimit || !!lastKey;

    return {
      items,
      lastEvaluatedKey: lastKey,
      hasMore,
    };
  },

  // Delete item
  async deleteItem(tableName: string, key: Record<string, unknown>) {
    const command = new DeleteCommand({
      TableName: getTableName(tableName),
      Key: key,
    });
    return await ddb.send(command);
  },

  // Atomic update with UpdateExpression
  async updateItem(
    tableName: string,
    key: Record<string, unknown>,
    options: UpdateOptions
  ) {
    const command = new UpdateCommand({
      TableName: getTableName(tableName),
      Key: key,
      UpdateExpression: options.updateExpression,
      ExpressionAttributeNames: options.expressionAttributeNames,
      ExpressionAttributeValues: options.expressionAttributeValues,
      ConditionExpression: options.conditionExpression,
      ReturnValues: options.returnValues || 'ALL_NEW',
    });

    const response = await ddb.send(command);
    return response.Attributes;
  },

  // Query with composite key support
  async queryItems(
    tableName: string,
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, unknown>,
    options?: {
      indexName?: string;
      scanIndexForward?: boolean;
      limit?: number;
    }
  ) {
    const command = new QueryCommand({
      TableName: getTableName(tableName),
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      IndexName: options?.indexName,
      ScanIndexForward: options?.scanIndexForward,
      Limit: options?.limit,
    });

    const response = await ddb.send(command);
    return response.Items || [];
  },

  // Batch get items (up to 100 items per request)
  // 10x faster than sequential GetItem calls
  async batchGetItems(tableName: string, keys: Record<string, unknown>[]) {
    if (keys.length === 0) return [];

    const command = new BatchGetCommand({
      RequestItems: {
        [getTableName(tableName)]: {
          Keys: keys,
        },
      },
    });

    const response = await ddb.send(command);
    return response.Responses?.[getTableName(tableName)] || [];
  },

  // Count items with optional filter (efficient - doesn't fetch item data)
  async countItems(tableName: string, options?: {
    filterExpression?: string;
    expressionAttributeNames?: Record<string, string>;
    expressionAttributeValues?: Record<string, unknown>;
  }): Promise<number> {
    let totalCount = 0;
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const command = new ScanCommand({
        TableName: getTableName(tableName),
        Select: 'COUNT',
        ExclusiveStartKey: lastEvaluatedKey,
        ...(options?.filterExpression && { FilterExpression: options.filterExpression }),
        ...(options?.expressionAttributeNames && { ExpressionAttributeNames: options.expressionAttributeNames }),
        ...(options?.expressionAttributeValues && { ExpressionAttributeValues: options.expressionAttributeValues }),
      });

      const response = await ddb.send(command);
      totalCount += response.Count || 0;
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return totalCount;
  },
};

// Export client for advanced operations
export { client as dynamoClient };
