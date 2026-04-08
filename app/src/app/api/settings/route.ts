import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { startAutomationEngine } from "@/lib/automation-engine";

// Keys that should be masked when returned
const SENSITIVE_KEYS = ["ha_token", "mqtt_password", "vnc_password"];

export async function GET() {
  try {
    startAutomationEngine();
    const all = db.select().from(settings).all();
    const result: Record<string, string> = {};
    for (const row of all) {
      result[row.key] = SENSITIVE_KEYS.includes(row.key)
        ? row.value ? "********" : ""
        : row.value;
    }
    return Response.json(result);
  } catch {
    return Response.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (typeof body !== "object" || body === null) {
      return Response.json({ error: "Expected object" }, { status: 400 });
    }

    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== "string") continue;

      // Skip masked values (user didn't change the sensitive field)
      if (SENSITIVE_KEYS.includes(key) && value === "********") continue;

      const existing = db.select().from(settings).where(eq(settings.key, key)).get();
      if (existing) {
        db.update(settings).set({ value }).where(eq(settings.key, key)).run();
      } else {
        db.insert(settings).values({ key, value }).run();
      }
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
