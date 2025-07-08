import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { fromEnv } from "@aws-sdk/credential-providers";


// TODO: Set up AWS Cognito authentication(?)
const client = new DynamoDBClient({
  region: "us-east-2",
  credentials: fromEnv(),
  // logger: console, // TODO: DEBUG ONLY
});

const ddb = DynamoDBDocumentClient.from(client);

export const dynamodb = {
  // Create/Update item
  async putItem(tableName: string, item: any) {
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });
    return await ddb.send(command);
  },

  // Get item by key
  async getItem(tableName: string, key: Record<string, any>) {
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
  async deleteItem(tableName: string, key: Record<string, any>) {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: key,
    });
    return await ddb.send(command);
  },
};
