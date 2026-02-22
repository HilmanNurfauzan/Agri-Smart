import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { logger } from "../utils/logger";

const DB_VERSION = 5; // v5: Device ID support for Local View / Global Aggregation
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await SQLite.openDatabaseAsync("agrismart.db");
      await initializeDatabase(database);
      return database;
    })();
  }
  return dbPromise;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- App configuration (device_id, etc.)
    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    -- Logbook entries
    CREATE TABLE IF NOT EXISTS log_entries (
      id TEXT PRIMARY KEY NOT NULL,
      device_id TEXT NOT NULL,
      date TEXT NOT NULL,
      block TEXT NOT NULL,
      activity TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      photo TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    -- Diagnosis records
    CREATE TABLE IF NOT EXISTS diagnosis_records (
      id TEXT PRIMARY KEY NOT NULL,
      device_id TEXT NOT NULL,
      date TEXT NOT NULL,
      selected_symptoms TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      result_title TEXT NOT NULL,
      result_description TEXT NOT NULL,
      recommendations TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    -- Harvest records
    CREATE TABLE IF NOT EXISTS harvest_records (
      id TEXT PRIMARY KEY NOT NULL,
      device_id TEXT NOT NULL,
      date TEXT NOT NULL,
      block TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      quality TEXT NOT NULL DEFAULT 'Grade B',
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    -- Plants (for dashboard tracking)
    CREATE TABLE IF NOT EXISTS plants (
      id TEXT PRIMARY KEY NOT NULL,
      device_id TEXT NOT NULL,
      block TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'sehat',
      planted_date TEXT,
      notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    -- Alerts
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY NOT NULL,
      device_id TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      block TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0
    );

    -- Chat messages (for chatbot history)
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY NOT NULL,
      text TEXT NOT NULL,
      sender TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced INTEGER NOT NULL DEFAULT 0
    );

    -- Sync metadata
    CREATE TABLE IF NOT EXISTS sync_meta (
      table_name TEXT PRIMARY KEY NOT NULL,
      last_synced_at TEXT
    );

    -- DB version tracking
    CREATE TABLE IF NOT EXISTS db_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Check and handle DB version migration (must run BEFORE indexes)
  await handleMigration(database);

  // Performance indexes (safe now — all columns exist after migration)
  await database.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_log_entries_device_date ON log_entries(device_id, date);
    CREATE INDEX IF NOT EXISTS idx_harvest_records_device_date ON harvest_records(device_id, date);
    CREATE INDEX IF NOT EXISTS idx_diagnosis_records_device_date ON diagnosis_records(device_id, date);
    CREATE INDEX IF NOT EXISTS idx_plants_block_status ON plants(block, status);
  `);

  // Seed initial data if tables are empty
  await seedInitialData(database);
}

async function handleMigration(database: SQLite.SQLiteDatabase) {
  const row = await database.getFirstAsync<{ version: number }>(
    "SELECT version FROM db_version WHERE id = 1",
  );
  const currentVersion = row?.version ?? 0;

  if (currentVersion < DB_VERSION) {
    // v5: Device ID support — drop and recreate tables with new schema
    await database.execAsync(`
      DROP TABLE IF EXISTS log_entries;
      DROP TABLE IF EXISTS plants;
      DROP TABLE IF EXISTS harvest_records;
      DROP TABLE IF EXISTS alerts;
      DROP TABLE IF EXISTS diagnosis_records;
      DELETE FROM chat_messages;
      DELETE FROM sync_meta;
    `);
    // Re-run full schema creation after dropping
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS log_entries (
        id TEXT PRIMARY KEY NOT NULL,
        device_id TEXT NOT NULL,
        date TEXT NOT NULL,
        block TEXT NOT NULL,
        activity TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        photo TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS diagnosis_records (
        id TEXT PRIMARY KEY NOT NULL,
        device_id TEXT NOT NULL,
        date TEXT NOT NULL,
        selected_symptoms TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        result_title TEXT NOT NULL,
        result_description TEXT NOT NULL,
        recommendations TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS harvest_records (
        id TEXT PRIMARY KEY NOT NULL,
        device_id TEXT NOT NULL,
        date TEXT NOT NULL,
        block TEXT NOT NULL,
        quantity REAL NOT NULL DEFAULT 0,
        quality TEXT NOT NULL DEFAULT 'Grade B',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS plants (
        id TEXT PRIMARY KEY NOT NULL,
        device_id TEXT NOT NULL,
        block TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'sehat',
        planted_date TEXT,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY NOT NULL,
        device_id TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'info',
        block TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        synced INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0
      );

      INSERT OR REPLACE INTO db_version (id, version) VALUES (1, ${DB_VERSION});
    `);
    logger.log(
      `[DB] Migrated from v${currentVersion} to v${DB_VERSION} (device_id schema upgrade, clean slate)`,
    );
  }
}

async function seedInitialData(_database: SQLite.SQLiteDatabase) {
  // v5: No dummy data — production-ready clean state
  logger.log("[DB] Database bersih, tidak ada data dummy yang disuntikkan.");
}

// ============================================================
// DEVICE ID — Local View / Global Aggregation
// ============================================================

const SECURE_STORE_KEY = "agri_device_id";
let deviceIdPromise: Promise<string> | null = null;

/**
 * Mendapatkan Device ID unik untuk perangkat ini.
 * Menggunakan Promise Caching agar panggilan paralel saat startup
 * tidak membuat ID ganda (VULN-02).
 *
 * Urutan pencarian:
 *   1. SQLite `app_config`
 *   2. SecureStore (backup anti-clear-data) → jika ada, tulis balik ke SQLite
 *   3. Buat baru → simpan ke SQLite + SecureStore (VULN-01)
 */
export function getDeviceId(): Promise<string> {
  if (!deviceIdPromise) {
    deviceIdPromise = (async () => {
      const database = await getDatabase();

      // 1. Cek SQLite
      const row = await database.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_config WHERE key = 'device_id'",
      );
      if (row?.value) {
        // Pastikan SecureStore juga punya backup
        try {
          await SecureStore.setItemAsync(SECURE_STORE_KEY, row.value);
        } catch (_) {
          /* SecureStore opsional */
        }
        return row.value;
      }

      // 2. Cek SecureStore (fallback setelah clear data)
      try {
        const backupId = await SecureStore.getItemAsync(SECURE_STORE_KEY);
        if (backupId) {
          await database.runAsync(
            "INSERT OR REPLACE INTO app_config (key, value) VALUES ('device_id', ?)",
            [backupId],
          );
          logger.log("[DB] Device ID dipulihkan dari SecureStore");
          return backupId;
        }
      } catch (_) {
        /* SecureStore tidak tersedia, lanjut buat baru */
      }

      // 3. Buat ID baru
      const newId =
        Date.now().toString(36) + Math.random().toString(36).substring(2);
      await database.runAsync(
        "INSERT OR REPLACE INTO app_config (key, value) VALUES ('device_id', ?)",
        [newId],
      );
      try {
        await SecureStore.setItemAsync(SECURE_STORE_KEY, newId);
      } catch (_) {
        /* SecureStore opsional */
      }
      logger.log("[DB] Device ID baru dibuat");
      return newId;
    })();
  }
  return deviceIdPromise;
}

export async function closeDatabase() {
  if (dbPromise) {
    const database = await dbPromise;
    await database.closeAsync();
    dbPromise = null;
  }
}
