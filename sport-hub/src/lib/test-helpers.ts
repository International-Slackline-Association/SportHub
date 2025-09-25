import { dynamodb } from './dynamodb';
import { DatabaseSetup } from './db-setup';
import { DatabaseSeeder } from './seed-local-db';
import { type UserRecord, type ContestRecord, type AthleteRecord } from './seed-data';

export class TestHelpers {
  private dbSetup = new DatabaseSetup();
  private seeder = new DatabaseSeeder();

  // Test data generators
  generateTestUser(overrides: Partial<UserRecord> = {}): UserRecord {
    const id = overrides.id || `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      'rankings-dev-key': id,
      id,
      name: overrides.name || 'Test User',
      email: overrides.email || `${id}@test.local`,
      createdAt: overrides.createdAt || new Date().toISOString(),
      ...overrides
    };
  }

  generateTestContest(overrides: Partial<ContestRecord> = {}): ContestRecord {
    const contestId = overrides.contestId || `test-contest-${Date.now()}`;
    return {
      'contests-key': contestId,
      contestId,
      discipline: overrides.discipline || '1',
      date: overrides.date || new Date().toISOString().split('T')[0],
      name: overrides.name || 'Test Contest',
      normalizedName: overrides.normalizedName || 'test contest',
      prize: overrides.prize || 1,
      country: overrides.country || 'us',
      gender: overrides.gender || 1,
      city: overrides.city || 'Test City',
      category: overrides.category || 1,
      createdAt: overrides.createdAt || new Date().toISOString(),
      athleteCount: overrides.athleteCount || 0,
      ...overrides
    };
  }

  generateTestAthlete(overrides: Partial<AthleteRecord> = {}): AthleteRecord {
    const athleteId = overrides.athleteId || `test-athlete-${Date.now()}`;
    const contestId = overrides.contestId || `test-contest-${Date.now()}`;
    return {
      'athletes-key': `${athleteId}-${contestId}`,
      athleteId,
      name: overrides.name || 'Test Athlete',
      contestId,
      contestName: overrides.contestName || 'Test Contest',
      place: overrides.place || '1',
      points: overrides.points || 100,
      date: overrides.date || new Date().toISOString().split('T')[0],
      country: overrides.country || 'us',
      discipline: overrides.discipline || '1',
      createdAt: overrides.createdAt || new Date().toISOString(),
      ...overrides
    };
  }

  // Database operations
  async createTestUser(data?: Partial<UserRecord>): Promise<UserRecord> {
    const user = this.generateTestUser(data);
    await dynamodb.putItem('rankings', user as unknown as Record<string, unknown>);
    return user;
  }

  async createTestContest(data?: Partial<ContestRecord>): Promise<ContestRecord> {
    const contest = this.generateTestContest(data);
    await dynamodb.putItem('contests', contest as unknown as Record<string, unknown>);
    return contest;
  }

  async createTestAthlete(data?: Partial<AthleteRecord>): Promise<AthleteRecord> {
    const athlete = this.generateTestAthlete(data);
    await dynamodb.putItem('athletes', athlete as unknown as Record<string, unknown>);
    return athlete;
  }

  // Cleanup operations
  async cleanupTestData(testPrefix: string = 'test-'): Promise<number> {
    let totalCleaned = 0;

    // Clean users
    const users = await dynamodb.scanItems('rankings');
    if (users) {
      for (const user of users) {
        if (user.id?.toString().startsWith(testPrefix)) {
          await dynamodb.deleteItem('rankings', { 'rankings-dev-key': user.id });
          totalCleaned++;
        }
      }
    }

    // Clean contests
    const contests = await dynamodb.scanItems('contests');
    if (contests) {
      for (const contest of contests) {
        if (contest.contestId?.toString().startsWith(testPrefix)) {
          await dynamodb.deleteItem('contests', { 'contests-key': contest.contestId });
          totalCleaned++;
        }
      }
    }

    // Clean athletes
    const athletes = await dynamodb.scanItems('athletes');
    if (athletes) {
      for (const athlete of athletes) {
        if (athlete.athleteId?.toString().startsWith(testPrefix)) {
          await dynamodb.deleteItem('athletes', { 'athletes-key': athlete['athletes-key'] });
          totalCleaned++;
        }
      }
    }

    return totalCleaned;
  }

  // Query helpers
  async findUserById(id: string): Promise<UserRecord | null> {
    const item = await dynamodb.getItem('rankings', { 'rankings-dev-key': id });
    return item as UserRecord | null;
  }

  async findContestById(contestId: string): Promise<ContestRecord | null> {
    const item = await dynamodb.getItem('contests', { 'contests-key': contestId });
    return item as ContestRecord | null;
  }

  async findAthleteEntry(athleteId: string, contestId: string): Promise<AthleteRecord | null> {
    const item = await dynamodb.getItem('athletes', { 'athletes-key': `${athleteId}-${contestId}` });
    return item as AthleteRecord | null;
  }

  async getAllUsers(): Promise<UserRecord[]> {
    try {
      const items = await dynamodb.scanItems('rankings');
      return (items || []) as UserRecord[];
    } catch {
      console.warn('Rankings table not found, returning empty array');
      return [];
    }
  }

  async getAllContests(): Promise<ContestRecord[]> {
    try {
      const items = await dynamodb.scanItems('contests');
      return (items || []) as ContestRecord[];
    } catch {
      console.warn('Contests table not found, returning empty array');
      return [];
    }
  }

  async getAllAthletes(): Promise<AthleteRecord[]> {
    try {
      const items = await dynamodb.scanItems('athletes');
      return (items || []) as AthleteRecord[];
    } catch {
      console.warn('Athletes table not found, returning empty array');
      return [];
    }
  }

  // Test environment helpers
  async isTestEnvironmentReady(): Promise<{ ready: boolean; missing: string[] }> {
    const requiredTables = ['rankings', 'contests', 'athletes'];
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
      typeof (user as Record<string, unknown>).id === 'string' &&
      typeof (user as Record<string, unknown>).name === 'string' &&
      typeof (user as Record<string, unknown>).email === 'string' &&
      typeof (user as Record<string, unknown>).createdAt === 'string'
    );
  }

  validateContest(contest: unknown): contest is ContestRecord {
    return (
      !!contest &&
      typeof contest === 'object' &&
      typeof (contest as Record<string, unknown>).contestId === 'string' &&
      typeof (contest as Record<string, unknown>).name === 'string' &&
      typeof (contest as Record<string, unknown>).date === 'string'
    );
  }

  validateAthlete(athlete: unknown): athlete is AthleteRecord {
    return (
      !!athlete &&
      typeof athlete === 'object' &&
      typeof (athlete as Record<string, unknown>).athleteId === 'string' &&
      typeof (athlete as Record<string, unknown>).name === 'string' &&
      typeof (athlete as Record<string, unknown>).contestId === 'string'
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
      if (user.id.startsWith('test-')) {
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