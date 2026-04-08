import bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { users, sessions } from "./schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 12;
if (!process.env.JWT_SECRET) {
  throw new Error("[auth] JWT_SECRET environment variable is required. Set it before starting the app.");
}
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const SESSION_DURATION_HOURS = 72;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .setIssuedAt()
    .sign(JWT_SECRET);

  const sessionId = crypto.randomUUID();
  db.insert(sessions).values({
    id: sessionId,
    userId,
    token,
    expiresAt: expiresAt.toISOString(),
  }).run();

  return token;
}

export async function validateToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;
    if (!userId) return null;

    // Check session exists and hasn't been revoked
    const session = db.select().from(sessions).where(eq(sessions.token, token)).get();
    if (!session) return null;

    // Check expiry
    if (new Date(session.expiresAt) < new Date()) {
      db.delete(sessions).where(eq(sessions.token, token)).run();
      return null;
    }

    return { userId };
  } catch {
    return null;
  }
}

export async function validateTokenEdge(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId as string;
    if (!userId) return null;
    return { userId };
  } catch {
    return null;
  }
}

export function deleteSession(token: string): void {
  db.delete(sessions).where(eq(sessions.token, token)).run();
}

export function hasUsers(): boolean {
  const result = db.select().from(users).limit(1).all();
  return result.length > 0;
}

export function getUserByUsername(username: string) {
  return db.select().from(users).where(eq(users.username, username)).get();
}

export function cleanExpiredSessions(): void {
  const now = new Date().toISOString();
  db.delete(sessions).where(
    // Delete sessions where expires_at < now
    // Using raw SQL for date comparison
    eq(sessions.expiresAt, sessions.expiresAt) // placeholder
  ).run();

  // Direct SQL for proper date comparison
  const sqlite = (db as unknown as { $client: { exec: (sql: string) => void } }).$client;
  if (sqlite && typeof sqlite.exec === "function") {
    sqlite.exec(`DELETE FROM sessions WHERE expires_at < datetime('now')`);
  }
}
