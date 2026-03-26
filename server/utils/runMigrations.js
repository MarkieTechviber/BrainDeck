// server/utils/runMigrations.js
// Runs safe ALTER TABLE migrations at startup.
// Each migration is idempotent — checks column existence before adding.
// This ensures the DB schema always matches the models, even on existing installs.

const sequelize = require('../config/database');

const MIGRATIONS = [
  // profiles table — columns added after initial release
  { table: 'profiles', column: 'storageFolder',       sql: "ALTER TABLE profiles ADD COLUMN storageFolder VARCHAR(50) DEFAULT NULL" },
  { table: 'profiles', column: 'preferredAIMode',     sql: "ALTER TABLE profiles ADD COLUMN preferredAIMode VARCHAR(50) DEFAULT 'local'" },
  { table: 'profiles', column: 'preferredProvider',   sql: "ALTER TABLE profiles ADD COLUMN preferredProvider VARCHAR(50) DEFAULT 'claude'" },
  { table: 'profiles', column: 'preferredOllamaModel',sql: "ALTER TABLE profiles ADD COLUMN preferredOllamaModel VARCHAR(100) DEFAULT 'llama3'" },
];

async function runMigrations() {
  try {
    for (const m of MIGRATIONS) {
      const [rows] = await sequelize.query(
        `SELECT 1 FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME   = :table
           AND COLUMN_NAME  = :column
         LIMIT 1`,
        { replacements: { table: m.table, column: m.column }, type: sequelize.QueryTypes.SELECT }
      );

      if (!rows) {
        await sequelize.query(m.sql);
        console.log(`[Migration] Added column: ${m.table}.${m.column}`);
      }
    }

    // Backfill storageFolder for any legacy profiles missing it
    await sequelize.query(`
      UPDATE profiles
      SET storageFolder = CONCAT(
        UPPER(SUBSTRING(MD5(RAND()), 1, 8)), '-',
        UPPER(SUBSTRING(MD5(RAND()), 1, 8))
      )
      WHERE storageFolder IS NULL OR storageFolder = ''
    `);

  } catch (err) {
    console.error('[Migration] Error during startup migrations:', err.message);
    // Non-fatal — server continues even if migration fails
  }
}

module.exports = { runMigrations };
