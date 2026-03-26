import { db } from "./db";
import { settings } from "./schema";
import { eq } from "drizzle-orm";

export function getSetting(key: string, defaultValue: string = ""): string {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? defaultValue;
}

export function setSetting(key: string, value: string): void {
  const existing = db.select().from(settings).where(eq(settings.key, key)).get();
  if (existing) {
    db.update(settings).set({ value }).where(eq(settings.key, key)).run();
  } else {
    db.insert(settings).values({ key, value }).run();
  }
}
