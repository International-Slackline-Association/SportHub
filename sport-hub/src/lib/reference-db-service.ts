/**
 * Reference Database Service
 *
 * Queries the ISA reference database for user identity information.
 * This service retrieves name, email, and other identity data without duplicating it in the app DB.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// Reference table configuration
const REFERENCE_TABLE = process.env.REFERENCE_DB_TABLE || 'isa-users';
const REFERENCE_REGION = process.env.REFERENCE_DB_REGION || 'eu-central-1';
const localReferenceDB = process.env.NODE_ENV === 'development' && process.env.LOCAL_REFERENCE_DB === 'true';

let referenceClient = null

if(localReferenceDB){
  referenceClient = new DynamoDBClient({
    region: 'us-east-2',
    endpoint: 'http://localhost:8000',
    credentials: {
      accessKeyId: 'dummy',
      secretAccessKey: 'dummy',
    },
  });
}else{
    // Create separate DynamoDB client for reference DB (different region)
    referenceClient = new DynamoDBClient({
      region: REFERENCE_REGION,
      maxAttempts: 3,
      requestHandler: {
        httpsAgent: {
          maxSockets: 50,
          keepAlive: true,
          keepAliveMsecs: 1000,
        },
        connectionTimeout: 10000,  // 10 seconds for slow connections
        requestTimeout: 15000,     // 15 seconds total timeout
      },
    });

}
const referenceDdb = DynamoDBDocumentClient.from(referenceClient);

/**
 * User identity data from reference database
 */
export interface ReferenceUserIdentity {
  userId: string;           // Custom user ID (e.g., "ISA_FBE8B254")
  cognitoSub: string;       // Cognito UUID
  email: string;
  name: string;
  surname?: string;
  phoneNumber?: string;
  gender?: string;
  country?: string;
  city?: string;
  birthDate?: string;
  createdDateTime: string;
}

/**
 * Raw reference DB record structure
 */
interface ReferenceDBRecord {
  PK: string;                    // "user:ISA_FBE8B254"
  SK_GSI: string;                // "userDetails"
  GSI_SK: string;                // "email:user@example.com"
  cognitoSub: string;            // Cognito UUID
  cognitoUsername?: string;      // Usually same as cognitoSub
  name: string;
  surname?: string;
  phoneNumber?: string;
  gender?: string;
  country?: string;
  city?: string;
  birthDate?: string;
  createdDateTime: string;
}

/**
 * Get user identity by custom user ID
 *
 * @param userId - Custom user ID (e.g., "ISA_FBE8B254")
 * @returns User identity or null if not found
 */
export async function getReferenceUserById(userId: string): Promise<ReferenceUserIdentity | null> {
  try {
    const pk = userId.startsWith('user:') ? userId : `user:${userId}`;

    const command = new GetCommand({
      TableName: REFERENCE_TABLE,
      Key: { PK: pk, SK_GSI: 'userDetails' },
    });

    const response = await referenceDdb.send(command);

    if (!response.Item) {
      return null;
    }

    return mapToIdentity(response.Item as ReferenceDBRecord);
  } catch (error) {
    console.error('Error fetching reference user by ID:', error);
    return null;
  }
}

/**
 * Get user identity by Cognito sub (UUID)
 *
 * Scans table to find user by cognitoSub field
 * Note: This is inefficient. Consider adding a GSI on cognitoSub if frequent lookups are needed.
 *
 * @param cognitoSub - Cognito user UUID
 * @returns User identity or null if not found
 */
export async function getReferenceUserByCognitoSub(cognitoSub: string): Promise<ReferenceUserIdentity | null> {
  try {
    // Query using GSI if available, otherwise we need to scan
    // Assuming there's a GSI on cognitoSub - adjust if different
    const command = new QueryCommand({
      TableName: REFERENCE_TABLE,
      IndexName: 'cognitoSub-index', // Adjust GSI name if different
      KeyConditionExpression: 'cognitoSub = :cognitoSub',
      ExpressionAttributeValues: {
        ':cognitoSub': cognitoSub,
      },
      Limit: 1,
    });

    const response = await referenceDdb.send(command);

    if (!response.Items || response.Items.length === 0) {
      return null;
    }

    const item = response.Items[0] as ReferenceDBRecord;
    return mapToIdentity(item);
  } catch (error) {
    console.error('Error fetching reference user by Cognito sub:', error);
    return null;
  }
}

/**
 * Get user identity by email
 *
 * Uses GSI with SK_GSI and GSI_SK pattern
 *
 * @param email - User email address
 * @returns User identity or null if not found
 */
export async function getReferenceUserByEmail(email: string): Promise<ReferenceUserIdentity | null> {
  try {
    const command = new QueryCommand({
      TableName: REFERENCE_TABLE,
      IndexName: 'GSI', // Main GSI - adjust name if different
      KeyConditionExpression: 'SK_GSI = :skGsi AND GSI_SK = :gsiSk',
      ExpressionAttributeValues: {
        ':skGsi': 'userDetails',
        ':gsiSk': `email:${email}`,
      },
      Limit: 1,
    });

    const response = await referenceDdb.send(command);

    if (!response.Items || response.Items.length === 0) {
      return null;
    }

    const item = response.Items[0] as ReferenceDBRecord;
    return mapToIdentity(item);
  } catch (error) {
    console.error('Error fetching reference user by email:', error);
    return null;
  }
}

/**
 * Create user in reference database
 *
 * Called when a new user signs up and doesn't exist in reference DB yet
 *
 * @param cognitoSub - Cognito UUID
 * @param email - User email
 * @param name - User name
 * @returns Newly created user identity with generated custom ID
 */
export async function createReferenceUser(
  cognitoSub: string,
  email: string,
  name: string
): Promise<ReferenceUserIdentity> {
  // Generate custom user ID (format: ISA_XXXXXXXX)
  const customId = generateCustomUserId();
  const pk = `user:${customId}`;

  const record: ReferenceDBRecord = {
    PK: pk,
    SK_GSI: 'userDetails',
    GSI_SK: `email:${email}`,
    cognitoSub,
    cognitoUsername: cognitoSub,
    name,
    createdDateTime: new Date().toISOString(),
  };

  const command = new PutCommand({
    TableName: REFERENCE_TABLE,
    Item: record,
  });

  await referenceDdb.send(command);

  console.log(`Created reference user: ${customId} (${email})`);

  return mapToIdentity(record);
}

/**
 * Map reference DB record to identity object
 */
function mapToIdentity(record: ReferenceDBRecord): ReferenceUserIdentity {
  // Extract custom ID from PK (remove "user:" prefix)
  const userId = record.PK.replace(/^user:/, '');

  // Extract email from GSI_SK (remove "email:" prefix)
  const email = record.GSI_SK.replace(/^email:/, '');

  return {
    userId,
    cognitoSub: record.cognitoSub,
    email,
    name: record.name,
    surname: record.surname,
    phoneNumber: record.phoneNumber,
    gender: record.gender,
    country: record.country,
    city: record.city,
    birthDate: record.birthDate,
    createdDateTime: record.createdDateTime,
  };
}

/**
 * Generate custom user ID in format ISA_XXXXXXXX
 */
function generateCustomUserId(): string {
  // Generate 8 random hex characters (uppercase)
  const randomHex = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16).toUpperCase()
  ).join('');

  return `ISA_${randomHex}`;
}

/**
 * Update user identity in reference database
 *
 * @param userId - Custom user ID (e.g., "ISA_FBE8B254")
 * @param updates - Fields to update
 * @returns Updated user identity
 */
export async function updateReferenceUser(
  userId: string,
  updates: {
    name?: string;
    surname?: string;
    phoneNumber?: string;
    gender?: string;
    country?: string;
    city?: string;
    birthDate?: string;
    email?: string; // Updating email also updates GSI_SK
  }
): Promise<ReferenceUserIdentity> {
  const pk = userId.startsWith('user:') ? userId : `user:${userId}`;

  // Build update expression dynamically
  const updateExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  if (updates.name !== undefined) {
    updateExpressions.push('#name = :name');
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = updates.name;
  }

  if (updates.surname !== undefined) {
    updateExpressions.push('#surname = :surname');
    expressionAttributeNames['#surname'] = 'surname';
    expressionAttributeValues[':surname'] = updates.surname;
  }

  if (updates.phoneNumber !== undefined) {
    updateExpressions.push('#phoneNumber = :phoneNumber');
    expressionAttributeNames['#phoneNumber'] = 'phoneNumber';
    expressionAttributeValues[':phoneNumber'] = updates.phoneNumber;
  }

  if (updates.gender !== undefined) {
    updateExpressions.push('#gender = :gender');
    expressionAttributeNames['#gender'] = 'gender';
    expressionAttributeValues[':gender'] = updates.gender;
  }

  if (updates.country !== undefined) {
    updateExpressions.push('#country = :country');
    expressionAttributeNames['#country'] = 'country';
    expressionAttributeValues[':country'] = updates.country;
  }

  if (updates.city !== undefined) {
    updateExpressions.push('#city = :city');
    expressionAttributeNames['#city'] = 'city';
    expressionAttributeValues[':city'] = updates.city;
  }

  if (updates.birthDate !== undefined) {
    updateExpressions.push('#birthDate = :birthDate');
    expressionAttributeNames['#birthDate'] = 'birthDate';
    expressionAttributeValues[':birthDate'] = updates.birthDate;
  }

  if (updates.email !== undefined) {
    // Update GSI_SK when email changes
    updateExpressions.push('#GSI_SK = :GSI_SK');
    expressionAttributeNames['#GSI_SK'] = 'GSI_SK';
    expressionAttributeValues[':GSI_SK'] = `email:${updates.email}`;
  }

  if (updateExpressions.length === 0) {
    // No updates provided, just return current user
    const current = await getReferenceUserById(userId);
    if (!current) {
      throw new Error(`User not found: ${userId}`);
    }
    return current;
  }

  const command = new UpdateCommand({
    TableName: REFERENCE_TABLE,
    Key: { PK: pk, SK_GSI: 'userDetails' },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW',
  });

  const response = await referenceDdb.send(command);

  if (!response.Attributes) {
    throw new Error('Update failed - no attributes returned');
  }

  return mapToIdentity(response.Attributes as ReferenceDBRecord);
}

/**
 * Get multiple user identities by custom IDs (batch operation)
 *
 * @param userIds - Array of custom user IDs
 * @returns Map of userId to identity
 */
export async function getReferenceUsersBatch(
  userIds: string[]
): Promise<Map<string, ReferenceUserIdentity>> {
  const identities = new Map<string, ReferenceUserIdentity>();

  // TODO: Implement BatchGetItem for better performance
  // For now, fetch sequentially
  await Promise.all(
    userIds.map(async (userId) => {
      const identity = await getReferenceUserById(userId);
      if (identity) {
        identities.set(userId, identity);
      }
    })
  );

  return identities;
}
