import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

let _db: BetterSQLite3Database<typeof schema> | null = null;

function initDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, "homeserv.db");
  const sqlite = new Database(dbPath);

  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      room TEXT,
      source TEXT NOT NULL,
      config_json TEXT,
      state_json TEXT,
      last_seen TEXT
    );

    CREATE TABLE IF NOT EXISTS wol_devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mac_address TEXT NOT NULL,
      ip_address TEXT,
      last_wake TEXT
    );

    CREATE TABLE IF NOT EXISTS automations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      trigger_type TEXT NOT NULL,
      trigger_config_json TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_config_json TEXT NOT NULL,
      last_run_at TEXT,
      last_result TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_metrics (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      cpu REAL NOT NULL,
      memory REAL NOT NULL,
      disk_json TEXT,
      network_json TEXT,
      temps_json TEXT
    );

    CREATE TABLE IF NOT EXISTS media_favorites (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      added_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS network_devices (
      mac TEXT PRIMARY KEY,
      ip TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '---',
      vendor TEXT NOT NULL DEFAULT 'Unknown',
      ports_json TEXT NOT NULL DEFAULT '[]',
      last_seen TEXT NOT NULL,
      first_seen TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'offline'
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
    CREATE INDEX IF NOT EXISTS idx_devices_source ON devices(source);
  `);

  // Migrate old automations table if it has the old schema
  try {
    const cols = sqlite.prepare("PRAGMA table_info(automations)").all() as { name: string }[];
    const colNames = cols.map((c) => c.name);
    if (colNames.includes("trigger_json") && !colNames.includes("trigger_type")) {
      sqlite.prepare("DROP TABLE automations").run();
      sqlite.prepare(`
        CREATE TABLE automations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          trigger_type TEXT NOT NULL,
          trigger_config_json TEXT NOT NULL,
          action_type TEXT NOT NULL,
          action_config_json TEXT NOT NULL,
          last_run_at TEXT,
          last_result TEXT,
          last_error TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `).run();
    }
  } catch {
    // Table doesn't exist yet, will be created above
  }

  _db = drizzle(sqlite, { schema });
  return _db;
}

// Proxy that lazily initializes the DB on first access
export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop) {
    const instance = initDb();
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
