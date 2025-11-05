#!/usr/bin/env node

import { dynamodb } from './dynamodb';
import { DatabaseSetup } from './db-setup';
import { transformContestsData, generateTestUsers, getDataStats, type UserRecord, type EventRecord } from './seed-data';

export class DatabaseSeeder {
  private dbSetup = new DatabaseSetup();

  async seedUsers(users: UserRecord[], tableName: string = 'users'): Promise<{ success: number; failed: number }> {
    console.log(`🌱 Seeding ${users.length} users into ${tableName}...`);

    let success = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await dynamodb.putItem(tableName, user as unknown as Record<string, unknown>);
        success++;
        if (success % 100 === 0) {
          console.log(`   📝 Seeded ${success} users...`);
        }
      } catch (error) {
        console.error(`❌ Failed to seed user ${user.userId}:`, error);
        failed++;
      }
    }

    console.log(`✅ Users seeded: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  async seedEvents(events: EventRecord[], tableName: string = 'events'): Promise<{ success: number; failed: number }> {
    console.log(`🏆 Seeding ${events.length} events into ${tableName}...`);

    let success = 0;
    let failed = 0;

    for (const event of events) {
      try {
        await dynamodb.putItem(tableName, event as unknown as Record<string, unknown>);
        success++;
        if (success % 50 === 0) {
          console.log(`   🏆 Seeded ${success} events...`);
        }
      } catch (error) {
        console.error(`❌ Failed to seed event ${event.eventId}:`, error);
        failed++;
      }
    }

    console.log(`✅ Events seeded: ${success} success, ${failed} failed`);
    return { success, failed };
  }

  async clearTable(tableName: string): Promise<number> {
    console.log(`🧹 Clearing table ${tableName}...`);

    try {
      const items = await dynamodb.scanItems(tableName);
      if (!items || items.length === 0) {
        console.log(`ℹ️ Table ${tableName} is already empty`);
        return 0;
      }

      let deleted = 0;
      for (const item of items) {
        try {
          // Determine the key field based on table name
          let keyField: string;
          if (tableName.includes('users')) {
            keyField = 'userId';
          } else if (tableName.includes('events')) {
            keyField = 'eventId';
          } else {
            // Default to id field
            keyField = 'id';
          }

          const key = { [keyField]: item[keyField] };
          await dynamodb.deleteItem(tableName, key);
          deleted++;

          if (deleted % 100 === 0) {
            console.log(`   🗑️ Deleted ${deleted} items...`);
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

  async fullSeed(includeTestUsers: boolean = true): Promise<void> {
    console.log('🚀 Starting full database seed...');

    // Get transformed data
    const data = transformContestsData();
    const testUsers = includeTestUsers ? generateTestUsers(10) : [];

    // Show statistics
    const stats = getDataStats();
    console.log('📊 Data Statistics:');
    console.log(`   Users from events: ${data.users.length}`);
    console.log(`   Additional test users: ${testUsers.length}`);
    console.log(`   Total events: ${data.events.length}`);
    console.log(`   Total participations: ${stats.totalParticipations}`);
    console.log(`   Disciplines: ${stats.disciplines.join(', ')}`);
    console.log(`   Countries: ${stats.countries.join(', ')}`);
    console.log(`   Date range: ${stats.dateRange.earliest} to ${stats.dateRange.latest}`);
    console.log();

    // Ensure tables exist
    const createResults = await this.dbSetup.createAllTables();
    if (createResults.failed.length > 0) {
      console.error('❌ Failed to create some tables:', createResults.failed);
      return;
    }

    // Seed data
    const allUsers = [...data.users, ...testUsers];
    await this.seedUsers(allUsers, 'users');
    await this.seedEvents(data.events, 'events');

    console.log('🎉 Full database seed completed!');
  }

  async resetAndSeed(): Promise<void> {
    console.log('🔄 Resetting and seeding database...');

    // Clear all tables
    await this.clearTable('users');
    await this.clearTable('events');

    // Seed fresh data
    await this.fullSeed(true);

    console.log('🎉 Database reset and seed completed!');
  }

  async getSeededDataCount(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    // Check each table individually
    try {
      const users = await dynamodb.scanItems('users');
      counts['users'] = users?.length || 0;
    } catch {
      counts['users'] = 0;
      console.warn('Users table not found');
    }

    try {
      const events = await dynamodb.scanItems('events');
      counts['events'] = events?.length || 0;
    } catch {
      counts['events'] = 0;
      console.warn('Events table not found');
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
      seeder.fullSeed().catch(console.error);
      break;
    case 'reset':
      seeder.resetAndSeed().catch(console.error);
      break;
    case 'clear':
      Promise.all([
        seeder.clearTable('users'),
        seeder.clearTable('events')
      ]).catch(console.error);
      break;
    case 'count':
      seeder.getSeededDataCount().then(counts => {
        console.log('📊 Current data counts:');
        Object.entries(counts).forEach(([table, count]) => {
          console.log(`   ${table}: ${count} items`);
        });
      }).catch(console.error);
      break;
    default:
      console.log('Usage: node seed-local-db.js [seed|reset|clear|count]');
      break;
  }
}