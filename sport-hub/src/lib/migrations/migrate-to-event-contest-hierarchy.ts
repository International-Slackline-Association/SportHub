/**
 * Migration: Event/Contest Hierarchy + Judge/Organizer Support
 *
 * 1. Converts flat events table to Event → Contest hierarchy
 * 2. Adds primarySubType to users
 * 3. Renames eventParticipations → contestParticipations
 * 4. Initializes judge/organizer arrays
 *
 * Usage:
 *   pnpm migrate:hierarchy
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import type { UserRecord, EventRecord } from '../relational-types';

export async function migrateToEventContestHierarchy() {
  // Load environment
  const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local';
  const envPath = resolve(process.cwd(), envFile);
  config({ path: envPath, override: true });

  console.log('🚀 Starting Event/Contest hierarchy migration...');
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Env file: ${envFile}`);

  const { dynamodb } = await import('../dynamodb');

  try {
    // 1. Migrate users
    console.log('\n📊 Migrating users...');
    const users = await dynamodb.scanItems('users') as UserRecord[];
    console.log(`   Found ${users?.length || 0} users`);

    let usersUpdated = 0;
    for (const user of users || []) {
      const updates: Record<string, unknown> = {};

      // Add primarySubType
      if (!user.primarySubType) {
        updates.primarySubType = user.userSubTypes?.[0] || 'athlete';
      }

      // Rename eventParticipations → contestParticipations
      if ((user as any).eventParticipations && !user.contestParticipations) {
        updates.contestParticipations = (user as any).eventParticipations;
      }

      // Initialize judge fields
      if (user.userSubTypes?.includes('judge')) {
        if (!user.contestsJudged) updates.contestsJudged = [];
        if (!user.totalContestsJudged) updates.totalContestsJudged = 0;
      }

      // Initialize organizer fields
      if (user.userSubTypes?.includes('organizer')) {
        if (!user.eventsOrganized) updates.eventsOrganized = [];
        if (!user.totalEventsOrganized) updates.totalEventsOrganized = 0;
      }

      if (Object.keys(updates).length > 0) {
        const updatedUser = { ...user, ...updates };
        // Remove old field if it exists
        if ((updatedUser as any).eventParticipations) {
          delete (updatedUser as any).eventParticipations;
        }
        await dynamodb.putItem('users', updatedUser);
        usersUpdated++;
      }
    }

    console.log(`   ✅ Users updated: ${usersUpdated}`);

    // 2. Migrate events to Event/Contest hierarchy
    console.log('\n🏆 Migrating events to Event/Contest structure...');
    const oldEvents = await dynamodb.scanItems('events') as EventRecord[];
    console.log(`   Found ${oldEvents?.length || 0} events`);

    let eventsCreated = 0;
    let contestsCreated = 0;

    for (const oldEvent of oldEvents || []) {
      // Skip if this looks like it's already migrated (has sortKey)
      if ((oldEvent as any).sortKey) {
        console.log(`   ⏭️  Skipping ${oldEvent.eventId} (already migrated)`);
        continue;
      }

      // Create event metadata record
      const eventMetadata = {
        eventId: oldEvent.eventId,
        sortKey: 'metadata',
        type: oldEvent.type || 'competition',
        name: oldEvent.name,
        date: oldEvent.date,
        location: oldEvent.country,
        organizers: (oldEvent as any).organizers || [],
        totalContests: 1,  // Start with 1 contest (migrated data)
        createdAt: oldEvent.createdAt,
        profileUrl: oldEvent.profileUrl,
        thumbnailUrl: oldEvent.thumbnailUrl,
      };

      await dynamodb.putItem('events', eventMetadata);
      eventsCreated++;

      // Create contest record from old event data
      const contestRecord = {
        eventId: oldEvent.eventId,
        sortKey: 'Contest1',
        contestId: `${oldEvent.eventId}#Contest1`,
        contestName: oldEvent.name,  // Use event name as contest name for now
        discipline: oldEvent.discipline,
        date: oldEvent.date,
        category: oldEvent.category?.toString(),
        gender: oldEvent.gender?.toString(),
        participants: oldEvent.participants || [],
        judges: (oldEvent as any).judges || [],
        organizers: (oldEvent as any).organizers || [],
        createdAt: oldEvent.createdAt,
      };

      await dynamodb.putItem('events', contestRecord);
      contestsCreated++;

      // Delete old flat event record (cleanup)
      await dynamodb.deleteItem('events', { eventId: oldEvent.eventId });
    }

    console.log(`   ✅ Events created: ${eventsCreated}`);
    console.log(`   ✅ Contests created: ${contestsCreated}`);

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Users updated: ${usersUpdated}`);
    console.log(`   ✅ Events created: ${eventsCreated}`);
    console.log(`   ✅ Contests created: ${contestsCreated}`);
    console.log('\n🎉 Migration complete!');

    return {
      success: true,
      usersUpdated,
      eventsCreated,
      contestsCreated,
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// CLI execution
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  migrateToEventContestHierarchy()
    .then((result) => {
      console.log('\n✅ Migration completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}
