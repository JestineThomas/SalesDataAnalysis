const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

async function runMigration() {
  console.log('=== Running Database Migration ===');
  await db.initDb();

  const sqlFilePath = path.join(__dirname, '../db.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  try {
    console.log(`Executing SQL script from ${sqlFilePath}...`);
    await db.exec(sqlContent);
    console.log(' Migration completed successfully! Tables and views created.');
  } catch (error) {
    console.error(' Migration failed:', error.message);
    throw error;
  }
}

if (require.main === module) {
  runMigration().then(() => {
    console.log('Migration finished.');
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runMigration };
