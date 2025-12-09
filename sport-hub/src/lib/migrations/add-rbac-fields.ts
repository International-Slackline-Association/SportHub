/**
 * Migration script to add RBAC fields to existing users
 *
 * Run this once to update all existing users in DynamoDB with role-based access control fields.
 *
 * Usage:
 *   pnpm migrate:rbac           # Uses .env.local (local DynamoDB)
 *   NODE_ENV=production pnpm migrate:rbac  # Uses .env.production (hosted DB)
 *
 * The script automatically uses the correct database based on environment variables:
 * - DYNAMODB_LOCAL=true → local DynamoDB (table: local-users)
 * - Otherwise → AWS DynamoDB (table: users-dev)
 */

// Load environment variables based on NODE_ENV
import { config } from 'dotenv';
import { resolve } from 'path';
import type { UserRecord } from '../relational-types';

const USERS_TABLE = 'users';

/**
 * Main migration function
 */
export async function migrateAddRBACFields() {
  // Load environment variables BEFORE importing dynamodb module
  const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
  const envPath = resolve(process.cwd(), envFile);
  config({ path: envPath, override: true }); // Override existing env vars

  console.log(`📝 Loading environment from: ${envFile}`);
  console.log(`   DYNAMODB_LOCAL: ${process.env.DYNAMODB_LOCAL}`);
  console.log(`   DYNAMODB_ENDPOINT: ${process.env.DYNAMODB_ENDPOINT}`);
  console.log(`   AWS_SESSION_TOKEN: ${process.env.AWS_SESSION_TOKEN ? '(set)' : '(not set)'}`);

  // Dynamic import AFTER environment is configured
  const { dynamodb } = await import('../dynamodb');

  console.log('🚀 Starting RBAC migration...');
  console.log(`📋 Table: ${USERS_TABLE}`);

  try {
    // Get all users
    console.log('📊 Fetching all users from database...');
    const users = await dynamodb.scanItems(USERS_TABLE) as UserRecord[];

    if (!users || users.length === 0) {
      console.log('ℹ️  No users found to migrate');
      return {
        success: true,
        message: 'No users to migrate',
        usersUpdated: 0,
      };
    }

    console.log(`✅ Found ${users.length} users to process`);

    // Update each user
    let updated = 0;
    let skipped = 0;

    for (const user of users) {
      // Skip if already has role field
      if (user.role) {
        console.log(`⏭️  Skipping user ${user.userId} - already has role: ${user.role}`);
        skipped++;
        continue;
      }

      // Add RBAC fields
      const updatedUser: UserRecord = {
        ...user,
        role: 'user',                      // Default role
        roleAssignedAt: new Date().toISOString(),
        roleAssignedBy: 'system-migration',
        profileCompleted: false,
      };

      await dynamodb.putItem(USERS_TABLE, updatedUser);
      updated++;
      console.log(`✅ Updated user ${user.userId} with role: user`);
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Updated: ${updated} users`);
    console.log(`   ⏭️  Skipped: ${skipped} users (already had roles)`);
    console.log(`   📊 Total: ${users.length} users processed`);
    console.log('\n🎉 Migration complete!');

    return {
      success: true,
      usersUpdated: updated,
      usersSkipped: skipped,
      totalUsers: users.length,
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback function (if needed)
 *
 * WARNING: This will remove RBAC fields from all users
 */
export async function rollbackRBACFields() {
  // Load environment variables BEFORE importing dynamodb module
  const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
  const envPath = resolve(process.cwd(), envFile);
  config({ path: envPath, override: true }); // Override existing env vars

  console.log(`📝 Loading environment from: ${envFile}`);
  const { dynamodb } = await import('../dynamodb');

  console.log('⚠️  Starting RBAC rollback...');
  console.log('⚠️  This will remove role fields from all users!');

  try {
    const users = await dynamodb.scanItems(USERS_TABLE) as UserRecord[];

    if (!users || users.length === 0) {
      console.log('ℹ️  No users found');
      return;
    }

    let rolled_back = 0;

    for (const user of users) {
      // Remove RBAC fields by destructuring (we don't use these, just exclude them)
      // @ts-ignore - Intentionally unused variables for destructuring
      // eslint-disable-next-line
      const {
        role,
        permissions,
        roleAssignedAt,
        roleAssignedBy,
        userSubTypes,
        lastProfileUpdate,
        profileCompleted,
        ...cleanUser
      } = user;

      await dynamodb.putItem(USERS_TABLE, cleanUser as UserRecord);
      rolled_back++;
      console.log(`✅ Rolled back user ${user.userId}`);
    }

    console.log(`\n🎉 Rollback complete: ${rolled_back} users updated`);
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// Run migration if called directly (ES module check)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  migrateAddRBACFields()
    .then((result) => {
      console.log('\n✅ Migration completed successfully:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}
