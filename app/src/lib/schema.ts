import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
});

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  room: text("room"),
  source: text("source").notNull(),
  configJson: text("config_json"),
  stateJson: text("state_json"),
  lastSeen: text("last_seen"),
});

export const wolDevices = sqliteTable("wol_devices", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  macAddress: text("mac_address").notNull(),
  ipAddress: text("ip_address"),
  lastWake: text("last_wake"),
});

export const automations = sqliteTable("automations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  triggerType: text("trigger_type").notNull(),
  triggerConfigJson: text("trigger_config_json").notNull(),
  actionType: text("action_type").notNull(),
  actionConfigJson: text("action_config_json").notNull(),
  lastRunAt: text("last_run_at"),
  lastResult: text("last_result"),
  lastError: text("last_error"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const systemMetrics = sqliteTable("system_metrics", {
  id: text("id").primaryKey(),
  timestamp: text("timestamp")
    .notNull()
    .default(sql`(datetime('now'))`),
  cpu: real("cpu").notNull(),
  memory: real("memory").notNull(),
  diskJson: text("disk_json"),
  networkJson: text("network_json"),
  tempsJson: text("temps_json"),
});

export const mediaFavorites = sqliteTable("media_favorites", {
  id: text("id").primaryKey(),
  path: text("path").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  addedAt: text("added_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const networkDevices = sqliteTable("network_devices", {
  mac: text("mac").primaryKey(),
  ip: text("ip").notNull(),
  name: text("name").notNull().default("---"),
  vendor: text("vendor").notNull().default("Unknown"),
  portsJson: text("ports_json").notNull().default("[]"),
  lastSeen: text("last_seen").notNull(),
  firstSeen: text("first_seen").notNull(),
  status: text("status").notNull().default("offline"),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
