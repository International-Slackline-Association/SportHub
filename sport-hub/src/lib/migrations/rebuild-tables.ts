import { DatabaseSetup } from '../db-setup';

async function rebuildTables() {
  const db = new DatabaseSetup();
  
  console.log('🗑️  Deleting local tables...');
  try {
    await db.deleteTable('users');
    console.log('   ✓ Deleted users table');
  } catch {
    console.log('   ℹ️  users table does not exist');
  }

  try {
    await db.deleteTable('events');
    console.log('   ✓ Deleted events table');
  } catch {
    console.log('   ℹ️  events table does not exist');
  }
  
  console.log('\n⏳ Waiting 3 seconds for deletion to complete...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('✨ Creating fresh tables...');
  await db.createAllTables();
  
  console.log('\n✅ Tables rebuilt successfully!');
}

rebuildTables().catch(console.error);
