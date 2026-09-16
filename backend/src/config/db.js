const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let pool = null;
let pgliteInstance = null;
let isPgLite = false;

// Initialize Database connection
async function initDb() {
  if (pool || pgliteInstance) {
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://'))) {
    console.log('[DB] Connecting to PostgreSQL (Neon/External)...');
    try {
      const sslConfig = process.env.DATABASE_SSL === 'false' 
        ? false 
        : { rejectUnauthorized: false };

      pool = new Pool({
        connectionString: databaseUrl,
        ssl: sslConfig,
        connectionTimeoutMillis: 10000,
      });

      // Test connection
      const testRes = await pool.query('SELECT NOW() AS connected_time');
      console.log(`[DB] Connected to PostgreSQL successfully at ${testRes.rows[0].connected_time}`);
      return;
    } catch (err) {
      console.warn('[DB] Failed to connect to external PostgreSQL:', err.message);
      console.warn('[DB] Falling back to local embedded Postgres (PGlite)...');
      pool = null;
    }
  }

  // Fallback / Standalone embedded Postgres engine using PGlite
  console.log('[DB] Using embedded Postgres engine (PGlite)...');
  try {
    const { PGlite } = require('@electric-sql/pglite');
    const dataDir = path.join(__dirname, '../../pgdata');
    pgliteInstance = new PGlite(dataDir);
    isPgLite = true;
    console.log(`[DB] Embedded Postgres initialized with persistent storage at: ${dataDir}`);
  } catch (embeddedErr) {
    console.error('[DB] Failed to initialize embedded Postgres:', embeddedErr);
    throw embeddedErr;
  }
}

// Unified query runner (single statement with params)
async function query(text, params = []) {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (pool) {
    return pool.query(text, params);
  }

  if (pgliteInstance) {
    const res = await pgliteInstance.query(text, params);
    return {
      rows: res.rows || [],
      rowCount: res.rows ? res.rows.length : (res.affectedRows || 0),
    };
  }

  throw new Error('Database client not initialized');
}

// Multi-statement raw script execution (for migrations, DDL)
async function exec(text) {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (pool) {
    return pool.query(text);
  }

  if (pgliteInstance) {
    return pgliteInstance.exec(text);
  }

  throw new Error('Database client not initialized');
}

// Transaction client helper
async function getClient() {
  if (!pool && !pgliteInstance) {
    await initDb();
  }

  if (pool) {
    const client = await pool.connect();
    return client;
  }

  if (pgliteInstance) {
    // Mock client interface for pglite
    return {
      query: async (text, params = []) => {
        const res = await pgliteInstance.query(text, params);
        return {
          rows: res.rows || [],
          rowCount: res.rows ? res.rows.length : (res.affectedRows || 0),
        };
      },
      release: () => {},
    };
  }

  throw new Error('Database client not initialized');
}

module.exports = {
  initDb,
  query,
  exec,
  getClient,
  isUsingPgLite: () => isPgLite,
};
