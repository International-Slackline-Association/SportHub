import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";

// Environment detection for local development
const isLocal = process.env.DYNAMODB_LOCAL === 'true';
const isDevelopment = process.env.NODE_ENV === 'development';

// DEBUG: Log environment variables (uncomment when debugging)
// console.log('🐛 DynamoDB Environment Debug:');
// console.log('  DYNAMODB_LOCAL:', process.env.DYNAMODB_LOCAL);
// console.log('  DYNAMODB_ENDPOINT:', process.env.DYNAMODB_ENDPOINT);
// console.log('  NODE_ENV:', process.env.NODE_ENV);
// console.log('  AWS_REGION:', process.env.AWS_REGION);
// console.log('  isLocal:', isLocal);
// console.log('  isDevelopment:', isDevelopment);

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
  } : isDevelopment ? {
    credentials: fromEnv()
  } : {})
  // logger: console, // TODO: DEBUG ONLY
};

// console.log('🐛 DynamoDB Client Config:', JSON.stringify(clientConfig, null, 2));

const client = new DynamoDBClient(clientConfig);

const ddb = DynamoDBDocumentClient.from(client);

// Table name helpers for different environments
export const getTableName = (baseName: string) => {
  // For local DynamoDB (docker), use local- prefix
  if (isLocal) return `local-${baseName}`;
  // For everything else (AWS), always use -dev suffix
  // This ensures we never touch production tables
  return `${baseName}-dev`;
};

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

  // Scan all items
  async scanItems(tableName: string) {
    const command = new ScanCommand({
      TableName: getTableName(tableName),
    });
    const response = await ddb.send(command);
    return response.Items;
  },

  // Delete item
  async deleteItem(tableName: string, key: Record<string, unknown>) {
    const command = new DeleteCommand({
      TableName: getTableName(tableName),
      Key: key,
    });
    return await ddb.send(command);
  },
};

// Export client for advanced operations
export { client as dynamoClient };
