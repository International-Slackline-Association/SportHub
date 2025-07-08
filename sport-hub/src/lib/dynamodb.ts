import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";


// TODO: Set up AWS Cognito authentication(?)
// TODO: Set up Amplify role for all server-side AWS actions (like dynamodb access)
const client = new DynamoDBClient({
  region: "us-east-2",
  ...(process.env.NODE_ENV === 'development' ? { credentials: fromEnv() } : {})
  // logger: console, // TODO: DEBUG ONLY
});

const ddb = DynamoDBDocumentClient.from(client);

export const dynamodb = {
  // Create/Update item
  async putItem(tableName: string, item: Record<string, unknown>) {
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });
    return await ddb.send(command);
  },

  // Get item by key
  async getItem(tableName: string, key: Record<string, unknown>) {
    const command = new GetCommand({
      TableName: tableName,
      Key: key,
    });
    const response = await ddb.send(command);
    return response.Item;
  },

  // Scan all items
  async scanItems(tableName: string) {
    const command = new ScanCommand({
      TableName: tableName,
    });
    const response = await ddb.send(command);
    return response.Items;
  },

  // Delete item
  async deleteItem(tableName: string, key: Record<string, unknown>) {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: key,
    });
    return await ddb.send(command);
  },
};
