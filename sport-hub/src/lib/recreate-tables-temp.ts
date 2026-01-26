import { DatabaseSetup } from './db-setup';

async function recreateTables() {
  const db = new DatabaseSetup();
  
  console.log('🗑️  Deleting tables...');
  try {
    await db.deleteTable('local-users');
  } catch {
    console.log('   (local-users not found, ok)');
  }

  try {
    await db.deleteTable('local-events');
  } catch {
    console.log('   (local-events not found, ok)');
  }
  
  console.log('⏳ Waiting 2 seconds...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('✨ Creating tables...');
  await db.createAllTables();
  
  console.log('✅ Tables recreated successfully!');
}

recreateTables().catch(console.error);
