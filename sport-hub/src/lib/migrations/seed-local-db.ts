#!/usr/bin/env node

import { dynamodb } from '../dynamodb';
import { DatabaseSetup } from '../db-setup';
import { transformRankingsData } from './seed-from-rankings-data';
import type {
  UserProfileRecord,
  AthleteRankingRecord,
  AthleteParticipationRecord,
  EventMetadataRecord,
  ContestRecord
} from '../relational-types';

export class DatabaseSeeder {
  private dbSetup = new DatabaseSetup();

  /**
   * Seed user table records (Profiles, Rankings, Participations)
   */
  async seedUserRecords(
    profiles: UserProfileRecord[],
    rankings: AthleteRankingRecord[],
    participations: AthleteParticipationRecord[],
    tableName: string = 'sporthub-users'
  ): Promise<{ success: number; failed: number }> {
    // Combine all user table records
    const allRecords = [
      ...profiles,
      ...rankings,
      ...participations
    ];

    console.log(`🌱 Seeding ${allRecords.length} records into ${tableName}...`);
    console.log(`   👥 Profiles: ${profiles.length}`);
    console.log(`   🏆 Rankings: ${rankings.length}`);
    console.log(`   📋 Participations: ${participations.length}`);

    let success = 0;
    let failed = 0;

    for (const record of allRecords) {
      try {
        await dynamodb.putItem(tableName, record as unknown as Record<string, unknown>);
        success++;
        if (success % 500 === 0) {
          console.log(`   📝 Seeded ${success}/${allRecords.length} records...`);
        }
      } catch (error) {
        console.error(`❌ Failed to seed record ${record.userId}:${record.sortKey}:`, error);
        failed++;
      }
    }

    console.log(`✅ User records seeded: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Seed events table records (Event Metadata, Contests)
   */
  async seedEventRecords(
    eventMetadata: EventMetadataRecord[],
    contests: ContestRecord[],
    tableName: string = 'sporthub-events'
  ): Promise<{ success: number; failed: number }> {
    const allRecords = [...eventMetadata, ...contests];

    console.log(`🏆 Seeding ${allRecords.length} records into ${tableName}...`);
    console.log(`   📅 Event Metadata: ${eventMetadata.length}`);
    console.log(`   🎯 Contests: ${contests.length}`);

    let success = 0;
    let failed = 0;

    for (const record of allRecords) {
      try {
        await dynamodb.putItem(tableName, record as unknown as Record<string, unknown>);
        success++;
        if (success % 100 === 0) {
          console.log(`   🏆 Seeded ${success}/${allRecords.length} records...`);
        }
      } catch (error) {
        console.error(`❌ Failed to seed record ${record.eventId}:${record.sortKey}:`, error);
        failed++;
      }
    }

    console.log(`✅ Event records seeded: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Clear all items from a table
   */
  async clearTable(tableName: string): Promise<number> {
    console.log(`🧹 Clearing table ${tableName}...`);

    try {
      const items = await dynamodb.scanItems(tableName);
      if (!items || items.length === 0) {
        console.log(`ℹ️  Table ${tableName} is already empty`);
        return 0;
      }

      let deleted = 0;
      for (const item of items) {
        try {
          // Determine the key based on table name
          let key: Record<string, unknown>;
          if (tableName.includes('users')) {
            // Users table now has composite key (userId + sortKey)
            key = { userId: item.userId, sortKey: item.sortKey };
          } else if (tableName.includes('events')) {
            // Events table has composite key (eventId + sortKey)
            key = { eventId: item.eventId, sortKey: item.sortKey };
          } else {
            // Default to id field
            key = { id: item.id };
          }

          await dynamodb.deleteItem(tableName, key);
          deleted++;

          if (deleted % 500 === 0) {
            console.log(`   🗑️  Deleted ${deleted}/${items.length} items...`);
          }
        } catch (error) {
          console.error(`❌ Failed to delete item:`, error);
        }
      }

      console.log(`✅ Cleared ${deleted} items from ${tableName}`);
      return deleted;
    } catch (error) {
      console.error(`❌ Error clearing table ${tableName}:`, error);
      return 0;
    }
  }

  /**
   * Reset and seed database
   */
  async resetAndSeed(): Promise<void> {
    console.log('🔄 Resetting and seeding database...\n');

    // Clear all tables
    await this.clearTable('sporthub-users');
    console.log();
    await this.clearTable('sporthub-events');
    console.log();

    // Seed fresh data
    await this.fullSeedFromRankings();

    console.log('🎉 Database reset and seed completed!');
  }

  /**
   * Full database seed using ISA-Rankings mock data (rankings-seed-data.json).
   * Unlike fullSeed(), this does not require athlete_details.json or
   * contests_with_real_userids.json.  ISA user IDs are left blank intentionally.
   */
  async fullSeedFromRankings(): Promise<void> {
    console.log('🚀 Starting rankings-data seed...\n');

    const data = transformRankingsData();

    console.log('📋 Ensuring tables exist...');
    const createResults = await this.dbSetup.createAllTables();
    if (createResults.failed.length > 0) {
      console.error('❌ Failed to create some tables:', createResults.failed);
      return;
    }
    console.log();

    await this.seedUserRecords(
      data.userProfiles,
      data.athleteRankings,
      data.athleteParticipations,
      'sporthub-users'
    );
    console.log();

    await this.seedEventRecords(data.eventMetadata, data.contests, 'sporthub-events');
    console.log();

    console.log('🎉 Rankings-data seed completed!');
  }

  /**
   * Get current data counts from database
   */
  async getSeededDataCount(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    // Check users table with breakdown by sortKey pattern
    try {
      const users = await dynamodb.scanItems('sporthub-users');
      counts['users-total'] = users?.length || 0;

      if (users && users.length > 0) {
        const profiles = users.filter(u => u.sortKey === 'Profile');
        const rankings = users.filter(u => typeof u.sortKey === 'string' && u.sortKey.startsWith('Ranking:'));
        const participations = users.filter(u => typeof u.sortKey === 'string' && u.sortKey.startsWith('Participation:'));

        counts['users-profiles'] = profiles.length;
        counts['users-rankings'] = rankings.length;
        counts['users-participations'] = participations.length;
      }
    } catch (error) {
      counts['users-total'] = 0;
      console.warn('Users table not found or error:', error);
    }

    // Check events table with breakdown by sortKey pattern
    try {
      const events = await dynamodb.scanItems('sporthub-events');
      counts['events-total'] = events?.length || 0;

      if (events && events.length > 0) {
        const metadata = events.filter(e => e.sortKey === 'Metadata');
        const contests = events.filter(e => typeof e.sortKey === 'string' && e.sortKey.startsWith('Contest:'));

        counts['events-metadata'] = metadata.length;
        counts['events-contests'] = contests.length;
      }
    } catch (error) {
      counts['events-total'] = 0;
      console.warn('Events table not found or error:', error);
    }

    return counts;
  }
}

// CLI interface when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const seeder = new DatabaseSeeder();
  const action = process.argv[2] || 'seed';

  switch (action) {
    case 'seed':
      seeder.fullSeedFromRankings().catch(console.error);
      break;
    case 'reset':
      seeder.resetAndSeed().catch(console.error);
      break;
    case 'clear':
      Promise.all([
        seeder.clearTable('sporthub-users'),
        seeder.clearTable('sporthub-events')
      ]).catch(console.error);
      break;
    case 'count':
      seeder.getSeededDataCount().then(counts => {
        console.log('📊 Current data counts:');
        console.log('\nUsers table:');
        console.log(`  Total: ${counts['users-total'] || 0} items`);
        console.log(`    - Profiles: ${counts['users-profiles'] || 0}`);
        console.log(`    - Rankings: ${counts['users-rankings'] || 0}`);
        console.log(`    - Participations: ${counts['users-participations'] || 0}`);
        console.log('\nEvents table:');
        console.log(`  Total: ${counts['events-total'] || 0} items`);
        console.log(`    - Metadata: ${counts['events-metadata'] || 0}`);
        console.log(`    - Contests: ${counts['events-contests'] || 0}`);
      }).catch(console.error);
      break;
    default:
      console.log('Usage: pnpm tsx src/lib/seed-local-db.ts [seed|reset|clear|count]');
      console.log('');
      console.log('Commands:');
      console.log('  seed   - Seed database with transformed data (default)');
      console.log('  reset  - Clear and reseed all tables');
      console.log('  clear  - Clear all tables without reseeding');
      console.log('  count  - Show current data counts');
      break;
  }
}
