import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: 'us-east-2',
  endpoint: 'http://localhost:8000',
  credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
});

const ddb = DynamoDBDocumentClient.from(client);

async function testWrite() {
  console.log('Testing single item write...');
  
  const testItem = {
    userId: 'SportHubID:test123',
    sortKey: 'Profile',
    athleteSlug: 'test-athlete',
    role: 'user',
    totalPoints: 100
  };
  
  try {
    await ddb.send(new PutCommand({
      TableName: 'local-users',
      Item: testItem
    }));
    console.log('✅ Successfully wrote test item!');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testWrite();
