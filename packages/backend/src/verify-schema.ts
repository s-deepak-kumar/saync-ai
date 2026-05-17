import { Database } from 'bun:sqlite';

const db = new Database('.saync/saync.db');

console.log('📋 Database Tables:');
const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach((table: any) => {
  console.log(`  - ${table.name}`);
});

console.log('\n🔍 Schema Details:');
tables.forEach((table: any) => {
  if (table.name.startsWith('__drizzle')) return;
  console.log(`\n${table.name}:`);
  const schema = db.query(`PRAGMA table_info(${table.name})`).all();
  schema.forEach((col: any) => {
    console.log(`  ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
  });
});

db.close();

// Made with Bob
