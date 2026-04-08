import { db } from "./db";
import { settings } from "./schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const SENSITIVE_KEYS = ["ha_token", "mqtt_password", "vnc_password"];
const ENCRYPTION_PREFIX = "enc:";

function getEncryptionKey(): Buffer | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  // Derive a 32-byte key from JWT_SECRET using SHA-256
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: enc:iv:tag:ciphertext (all hex)
  return `${ENCRYPTION_PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(stored: string): string {
  if (!stored.startsWith(ENCRYPTION_PREFIX)) return stored;
  const key = getEncryptionKey();
  if (!key) return stored;
  try {
    const parts = stored.slice(ENCRYPTION_PREFIX.length).split(":");
    if (parts.length !== 3) return stored;
    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    const encrypted = Buffer.from(parts[2], "hex");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return stored;
  }
}

export function getSetting(key: string, defaultValue: string = ""): string {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  if (!row) return defaultValue;
  return SENSITIVE_KEYS.includes(key) ? decrypt(row.value) : row.value;
}

export function setSetting(key: string, value: string): void {
  const storedValue = SENSITIVE_KEYS.includes(key) ? encrypt(value) : value;
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) {
    db.update(settings).set({ value: storedValue }).where(eq(settings.key, key)).run();
  } else {
    db.insert(settings).values({ key, value: storedValue }).run();
  }
}
