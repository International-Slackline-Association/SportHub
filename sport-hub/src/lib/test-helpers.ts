import { dynamodb } from './dynamodb';
import { DatabaseSetup } from './db-setup';
import { DatabaseSeeder } from './seed-local-db';
import type { UserProfileRecord, EventMetadataRecord } from './relational-types';

// Backward compatibility type for old test code
type EventRecord = EventMetadataRecord;
type UserRecord = UserProfileRecord;

export class TestHelpers {
  private dbSetup = new DatabaseSetup();
  private seeder = new DatabaseSeeder();

  // Test data generators
  generateTestUser(overrides: Partial<UserRecord> = {}): UserRecord {
    const userId = overrides.userId || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      userId,
      sortKey: 'Profile', // New hierarchical schema
      athleteSlug: overrides.athleteSlug || userId.replace(/^test-/, 'test-athlete-'),
      role: 'user',
      userSubTypes: ['athlete'],
      primarySubType: 'athlete',
      createdAt: Date.now(),
      totalPoints: overrides.totalPoints || 0,
      contestCount: overrides.contestCount || 0,
      ...overrides
    };
  }

  generateTestEvent(overrides: Partial<EventRecord> = {}): EventRecord {
    const eventId = overrides.eventId || `test-event-${Date.now()}`;
    const date = overrides.startDate || new Date().toISOString().split('T')[0];
    return {
      eventId,
      sortKey: 'Metadata', // New hierarchical schema (capital M)
      eventName: overrides.eventName || 'Test Event',
      startDate: date,
      endDate: overrides.endDate || date,
      location: overrides.location || 'Test Location',
      country: overrides.country || 'USA',
      contestCount: overrides.contestCount || 0,
      type: 'competition',
      createdAt: Date.now(),
      ...overrides
    };
  }

  // Database operations
  async createTestUser(data?: Partial<UserRecord>): Promise<UserRecord> {
    const user = this.generateTestUser(data);
    await dynamodb.putItem('users', user as unknown as Record<string, unknown>);
    return user;
  }

  async createTestEvent(data?: Partial<EventRecord>): Promise<EventRecord> {
    const event = this.generateTestEvent(data);
    await dynamodb.putItem('events', event as unknown as Record<string, unknown>);
    return event;
  }

  // Cleanup operations
  async cleanupTestData(testPrefix: string = 'test-'): Promise<number> {
    let totalCleaned = 0;

    // Clean users (use composite key: userId + sortKey)
    const users = await dynamodb.scanItems('users');
    if (users) {
      for (const user of users) {
        if (user.userId?.toString().startsWith(testPrefix)) {
          await dynamodb.deleteItem('users', {
            userId: user.userId,
            sortKey: user.sortKey // Composite key required
          });
          totalCleaned++;
        }
      }
    }

    // Clean events (use composite key: eventId + sortKey)
    const events = await dynamodb.scanItems('events');
    if (events) {
      for (const event of events) {
        if (event.eventId?.toString().startsWith(testPrefix)) {
          await dynamodb.deleteItem('events', {
            eventId: event.eventId,
            sortKey: event.sortKey // Composite key required
          });
          totalCleaned++;
        }
      }
    }

    return totalCleaned;
  }

  // Query helpers
  async findUserById(userId: string): Promise<UserRecord | null> {
    // Use composite key to get Profile record
    const item = await dynamodb.getItem('users', {
      userId,
      sortKey: 'Profile'
    });
    return item as UserRecord | null;
  }

  async findEventById(eventId: string): Promise<EventRecord | null> {
    // Use composite key to get Metadata record
    const item = await dynamodb.getItem('events', {
      eventId,
      sortKey: 'Metadata'
    });
    return item as EventRecord | null;
  }

  async getAllUsers(): Promise<UserRecord[]> {
    try {
      const items = await dynamodb.scanItems('users');
      // Filter to only Profile records (sortKey = "Profile")
      return (items || []).filter(item => item.sortKey === 'Profile') as UserRecord[];
    } catch {
      console.warn('Users table not found, returning empty array');
      return [];
    }
  }

  async getAllEvents(): Promise<EventRecord[]> {
    try {
      const items = await dynamodb.scanItems('events');
      // Filter to only Metadata records (sortKey = "Metadata")
      return (items || []).filter(item => item.sortKey === 'Metadata') as EventRecord[];
    } catch {
      console.warn('Events table not found, returning empty array');
      return [];
    }
  }

  // Test environment helpers
  async isTestEnvironmentReady(): Promise<{ ready: boolean; missing: string[] }> {
    const requiredTables = ['users', 'events'];
    const missing: string[] = [];

    for (const table of requiredTables) {
      const exists = await this.dbSetup.tableExists(table);
      if (!exists) {
        missing.push(table);
      }
    }

    return {
      ready: missing.length === 0,
      missing
    };
  }

  async setupTestEnvironment(): Promise<boolean> {
    try {
      console.log('🛠️ Setting up test environment...');

      // Create tables if they don't exist
      const results = await this.dbSetup.createAllTables();
      if (results.failed.length > 0) {
        console.error('❌ Failed to create tables:', results.failed);
        return false;
      }

      console.log('✅ Test environment ready');
      return true;
    } catch (error) {
      console.error('❌ Error setting up test environment:', error);
      return false;
    }
  }

  async seedTestEnvironment(): Promise<boolean> {
    try {
      console.log('🌱 Seeding test environment...');

      // Setup environment first
      const setupSuccess = await this.setupTestEnvironment();
      if (!setupSuccess) {
        return false;
      }

      // Seed with sample data
      await this.seeder.fullSeed(true);

      console.log('✅ Test environment seeded');
      return true;
    } catch (error) {
      console.error('❌ Error seeding test environment:', error);
      return false;
    }
  }

  // Data validation helpers
  validateUser(user: unknown): user is UserRecord {
    return (
      !!user &&
      typeof user === 'object' &&
      typeof (user as Record<string, unknown>).userId === 'string' &&
      (user as Record<string, unknown>).sortKey === 'Profile' &&
      typeof (user as Record<string, unknown>).createdAt === 'number'
    );
  }

  validateEvent(event: unknown): event is EventRecord {
    return (
      !!event &&
      typeof event === 'object' &&
      typeof (event as Record<string, unknown>).eventId === 'string' &&
      (event as Record<string, unknown>).sortKey === 'Metadata' &&
      typeof (event as Record<string, unknown>).eventName === 'string' &&
      typeof (event as Record<string, unknown>).startDate === 'string'
    );
  }

  // Statistics and reporting
  async getTestStats(): Promise<{
    tables: Record<string, number>;
    testDataCount: number;
    realDataCount: number;
  }> {
    const counts = await this.seeder.getSeededDataCount();

    // Count test data (items starting with 'test-')
    let testDataCount = 0;
    let realDataCount = 0;

    const users = await this.getAllUsers();
    for (const user of users) {
      if (user.userId.startsWith('test-')) {
        testDataCount++;
      } else {
        realDataCount++;
      }
    }

    return {
      tables: counts,
      testDataCount,
      realDataCount
    };
  }
}

// Export singleton instance
export const testHelpers = new TestHelpers();