import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: 'us-east-2',
  endpoint: 'http://localhost:8000',
  credentials: { accessKeyId: 'dummy', secretAccessKey: 'dummy' }
});

const ddb = DynamoDBDocumentClient.from(client);

async function forceClear() {
  console.log('🧹 Force clearing local-users table...');
  
  let deletedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  
  do {
    const scanResult = await ddb.send(new ScanCommand({
      TableName: 'local-users',
      Limit: 25,
      ExclusiveStartKey: lastEvaluatedKey
    }));

    if (scanResult.Items && scanResult.Items.length > 0) {
      const deleteRequests = scanResult.Items.map(item => ({
        DeleteRequest: {
          Key: {
            userId: item.userId,
            sortKey: item.sortKey
          }
        }
      }));

      await ddb.send(new BatchWriteCommand({
        RequestItems: {
          'local-users': deleteRequests
        }
      }));

      deletedCount += scanResult.Items.length;
      if (deletedCount % 100 === 0) {
        console.log(`   Deleted ${deletedCount} items...`);
      }
    }
    
    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);
  
  console.log(`✅ Cleared ${deletedCount} items from local-users`);
}

forceClear().catch(console.error);
