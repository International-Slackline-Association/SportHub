import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";


const client = new DynamoDBClient({
  region: "us-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
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
