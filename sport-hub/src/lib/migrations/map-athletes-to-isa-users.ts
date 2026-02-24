/**
 * Map Athletes to isa-users by Name Matching
 *
 * ISA-Rankings AthleteDetails don't have isaUsersId field.
 * This script matches athletes to isa-users records by normalized full name and updates profiles.
 *
 * Based on export-from-isa-rankings.ts matching logic.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: 'us-east-2',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
});

const ddbClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true }
});

interface AthleteProfile {
  userId: string; // SportHubID
  sortKey: string; // "Profile"
  athleteSlug: string;
  isaRankingsPK?: string; // e.g., "Athlete:john-doe"
  isaUsersId?: string;
}

async function mapAthletesToIsaUsers() {
  console.log('🔗 Mapping athletes to isa-users by normalized name...\n');

  // Step 1: Build name lookup map from isa-users table
  console.log('📚 Building name lookup map from isa-users...');
  const nameLookup = new Map<string, { userId: string; country?: string; originalName: string }>();

  const isaUsersResult = await ddbClient.send(new ScanCommand({
    TableName: 'isa-users',
    FilterExpression: 'SK_GSI = :details',
    ExpressionAttributeValues: {
      ':details': 'userDetails'
    }
  }));

  if (!isaUsersResult.Items || isaUsersResult.Items.length === 0) {
    console.log('⚠️  No users found in isa-users table');
    return;
  }

  for (const item of isaUsersResult.Items) {
    const name = item.name as string;
    const surname = item.surname as string;
    const userId = (item.PK as string).replace(/^user:/, ''); // Extract ISA_XXXXXXXX

    if (name && surname) {
      // Normalize: "Claire Irad" → "claire irad" (keep spaces, lowercase)
      const normalizedName = `${name} ${surname}`.toLowerCase();
      const originalName = `${name} ${surname}`;
      nameLookup.set(normalizedName, {
        userId,
        country: item.country as string | undefined,
        originalName
      });
      console.log(`   ${userId}: ${originalName} (${item.country || 'no country'})`);
    }
  }

  console.log(`✅ Built lookup map with ${nameLookup.size} users\n`);

  // Step 2: Get ISA-Rankings AthleteDetails to get normalized names
  console.log('📥 Scanning ISA-Rankings for athlete normalized names...');
  const isaRankingsResult = await ddbClient.send(new ScanCommand({
    TableName: 'ISA-Rankings',
    FilterExpression: 'SK_GSI = :athleteDetails',
    ExpressionAttributeValues: {
      ':athleteDetails': 'AthleteDetails'
    }
  }));

  const isaAthletes = new Map<string, string>(); // athletePK → normalizedFullname
  for (const item of isaRankingsResult.Items || []) {
    const athletePK = item.PK as string; // e.g., "Athlete:john-doe"
    const normalizedFullname = item.normalizedFullname as string | undefined;
    const name = item.name as string | undefined;
    const surname = item.surname as string | undefined;

    // Use normalizedFullname if available, otherwise construct from name + surname
    let normalized = normalizedFullname;
    if (!normalized && name) {
      normalized = surname ? `${name} ${surname}`.toLowerCase() : name.toLowerCase();
    }

    if (normalized) {
      isaAthletes.set(athletePK, normalized);
    }
  }

  console.log(`✅ Found ${isaAthletes.size} ISA-Rankings athletes with names\n`);

  // Step 3: Scan athlete profiles from local-users
  console.log('📥 Scanning athlete profiles in local-users...');
  const profilesResult = await ddbClient.send(new ScanCommand({
    TableName: 'local-users',
    FilterExpression: 'sortKey = :profile AND primarySubType = :athlete',
    ExpressionAttributeValues: {
      ':profile': 'Profile',
      ':athlete': 'athlete'
    }
  }));

  const profiles = (profilesResult.Items || []) as AthleteProfile[];
  console.log(`✅ Found ${profiles.length} athlete profiles\n`);

  // Step 4: Match athletes to isa-users by normalized name
  console.log('🔍 Matching athletes to isa-users by normalized name...');
  let matchedCount = 0;
  let unmatchedCount = 0;
  const updates: Array<{ userId: string; isaUsersId: string; originalName: string }> = [];

  for (const profile of profiles) {
    // Get ISA-Rankings PK (e.g., "Athlete:john-doe")
    const isaRankingsPK = profile.isaRankingsPK;
    if (!isaRankingsPK) {
      unmatchedCount++;
      continue;
    }

    // Get normalized name from ISA-Rankings
    const normalizedName = isaAthletes.get(isaRankingsPK);
    if (!normalizedName) {
      unmatchedCount++;
      continue;
    }

    // Try to find match in isa-users
    const match = nameLookup.get(normalizedName);
    if (match) {
      console.log(`   ✅ MATCH: ${profile.athleteSlug} → ${match.originalName} (${match.userId})`);
      updates.push({
        userId: profile.userId,
        isaUsersId: match.userId,
        originalName: match.originalName
      });
      matchedCount++;
    } else {
      unmatchedCount++;
    }
  }

  console.log(`\n📊 Matching results:`);
  console.log(`   Matched: ${matchedCount}`);
  console.log(`   Unmatched: ${unmatchedCount} (will use country fallback '-')`);

  // Step 5: Update matched profiles with isaUsersId
  if (updates.length > 0) {
    console.log(`\n📝 Updating ${updates.length} profiles with isaUsersId...`);

    for (const update of updates) {
      await ddbClient.send(new UpdateCommand({
        TableName: 'local-users',
        Key: {
          userId: update.userId,
          sortKey: 'Profile'
        },
        UpdateExpression: 'SET isaUsersId = :isaUsersId',
        ExpressionAttributeValues: {
          ':isaUsersId': update.isaUsersId
        }
      }));
    }

    console.log(`✅ Updated ${updates.length} profiles with isaUsersId\n`);
  } else {
    console.log(`\n⚠️  No matches found - no profiles updated\n`);
  }

  console.log('✅ Mapping complete!');
  console.log(`\n📋 Summary:`);
  console.log(`   isa-users: ${nameLookup.size} users`);
  console.log(`   ISA-Rankings athletes: ${isaAthletes.size}`);
  console.log(`   SportHub profiles: ${profiles.length}`);
  console.log(`   Matched: ${matchedCount}`);
  console.log(`   Updated: ${updates.length}`);
}

// Run the mapping
mapAthletesToIsaUsers().catch(console.error);
