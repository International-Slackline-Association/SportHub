/**
 * Migration: Convert single 'type' field to 'userSubTypes' array
 *
 * This script migrates the legacy 'type' field (single string) to the new
 * 'userSubTypes' field (array of UserSubType values).
 *
 * Migration rules:
 * - type: 'athlete' → userSubTypes: ['athlete']
 * - type: 'official' → userSubTypes: [] (no equivalent sub-type)
 * - type: 'admin' → userSubTypes: [] (admin is a role, not sub-type)
 *
 * Run with: pnpm migrate:subtypes           # Uses .env.local
 *           NODE_ENV=production pnpm migrate:subtypes  # Uses .env.production
 */

// Load environment variables based on NODE_ENV
import { config } from 'dotenv';
import { resolve } from 'path';
import type { UserRecord } from '../relational-types';
import type { UserSubType } from '../../types/rbac';

const USERS_TABLE = 'users';

interface MigrationStats {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
  breakdown: {
    athlete: number;
    official: number;
    admin: number;
    alreadyMigrated: number;
  };
}

async function migrateUserSubTypes(): Promise<MigrationStats> {
  // Load environment variables BEFORE importing dynamodb module
  const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
  const envPath = resolve(process.cwd(), envFile);
  config({ path: envPath, override: true }); // Override existing env vars

  console.log(`📝 Loading environment from: ${envFile}`);
  console.log(`   DYNAMODB_LOCAL: ${process.env.DYNAMODB_LOCAL}`);
  console.log(`   DYNAMODB_ENDPOINT: ${process.env.DYNAMODB_ENDPOINT}`);
  console.log(`   AWS_REGION: ${process.env.AWS_REGION}`);

  // Dynamic import AFTER environment is configured
  const { dynamodb } = await import('../dynamodb');

  console.log('🚀 Starting user sub-types migration...\n');

  const stats: MigrationStats = {
    total: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    breakdown: {
      athlete: 0,
      official: 0,
      admin: 0,
      alreadyMigrated: 0,
    },
  };

  try {
    // Fetch all users
    console.log(`📊 Fetching all users from ${USERS_TABLE}...`);
    const users = (await dynamodb.scanItems(USERS_TABLE)) as UserRecord[];
    stats.total = users.length;
    console.log(`✅ Found ${stats.total} users\n`);

    // Process each user
    for (const user of users) {
      try {
        // Skip if already has userSubTypes array populated
        if (user.userSubTypes && user.userSubTypes.length > 0) {
          stats.skipped++;
          stats.breakdown.alreadyMigrated++;
          console.log(`⏭️  Skipped ${user.name} (${user.userId}) - already migrated`);
          continue;
        }

        // Determine new userSubTypes based on legacy type
        let newSubTypes: UserSubType[] = [];

        if (user.type === 'athlete') {
          newSubTypes = ['athlete'];
          stats.breakdown.athlete++;
        } else if (user.type === 'official') {
          newSubTypes = [];
          stats.breakdown.official++;
        } else if (user.type === 'admin') {
          newSubTypes = [];
          stats.breakdown.admin++;
        } else {
          // No type or unknown type - default to empty array
          newSubTypes = [];
          console.log(`⚠️  User ${user.name} (${user.userId}) has no/unknown type: ${user.type}`);
        }

        // Update user with new userSubTypes field
        const updatedUser: UserRecord = {
          ...user,
          userSubTypes: newSubTypes,
          subTypesAssignedAt: new Date().toISOString(),
          subTypesAssignedBy: 'system-migration',
        };

        await dynamodb.putItem(USERS_TABLE, updatedUser);
        stats.updated++;

        console.log(
          `✅ Updated ${user.name} (${user.userId}): type='${user.type}' → userSubTypes=${JSON.stringify(newSubTypes)}`
        );
      } catch (error) {
        stats.errors++;
        console.error(`❌ Error updating user ${user.userId}:`, error);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total users:          ${stats.total}`);
    console.log(`✅ Successfully updated: ${stats.updated}`);
    console.log(`⏭️  Skipped:             ${stats.skipped}`);
    console.log(`❌ Errors:              ${stats.errors}`);
    console.log('\nBreakdown by type:');
    console.log(`  - Athletes:          ${stats.breakdown.athlete}`);
    console.log(`  - Officials:         ${stats.breakdown.official}`);
    console.log(`  - Admins:            ${stats.breakdown.admin}`);
    console.log(`  - Already migrated:  ${stats.breakdown.alreadyMigrated}`);
    console.log('='.repeat(60) + '\n');

    return stats;
  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
    throw error;
  }
}

// Run migration if called directly (ES module check)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  migrateUserSubTypes()
    .then((stats) => {
      if (stats.errors > 0) {
        console.error('\n⚠️  Migration completed with errors');
        process.exit(1);
      } else {
        console.log('\n✅ Migration completed successfully');
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

export { migrateUserSubTypes };
