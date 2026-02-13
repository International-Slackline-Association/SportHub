#!/usr/bin/env node
/**
 * Seed only events table - for fixing failed event seeding
 */

import { DatabaseSeeder } from './seed-local-db';
import { transformSeedData } from './seed-data';

async function seedEventsOnly() {
  console.log('🏆 Seeding events table only...\n');

  const seeder = new DatabaseSeeder();
  const data = transformSeedData();
  console.log();

  // Clear events table
  await seeder.clearTable('events');
  console.log();

  // Seed events only
  await seeder.seedEventRecords(data.eventMetadata, data.contests, 'events');
  console.log();

  console.log('🎉 Events table seeding completed!');
}

seedEventsOnly().catch(console.error);
