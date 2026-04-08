import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { automations, settings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { systemLogger } from "@/lib/logger";

const SENSITIVE_KEYS = ["ha_token", "mqtt_password", "vnc_password"];

export async function GET() {
  try {
    const allAutomations = db.select().from(automations).all();
    const allSettings = db.select().from(settings).all();

    // Exclude sensitive settings from export
    const safeSettings = allSettings.filter((s) => !SENSITIVE_KEYS.includes(s.key));

    const exported = {
      version: 1,
      exportedAt: new Date().toISOString(),
      automations: allAutomations,
      settings: safeSettings,
    };

    return new Response(JSON.stringify(exported, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="homeserv-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (e) {
    systemLogger.error("Export failed", { error: e instanceof Error ? e.message : String(e) });
    return Response.json({ error: "Export failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || body.version !== 1) {
      return Response.json({ error: "Invalid export file format" }, { status: 400 });
    }

    let importedAutomations = 0;
    let importedSettings = 0;

    // Import automations
    if (Array.isArray(body.automations)) {
      for (const row of body.automations) {
        if (!row.id || !row.name) continue;
        const existing = db.select().from(automations).where(eq(automations.id, row.id)).get();
        if (existing) {
          db.update(automations).set({
            name: row.name,
            enabled: row.enabled,
            triggerType: row.trigger_type,
            triggerConfigJson: row.trigger_config_json,
            actionType: row.action_type,
            actionConfigJson: row.action_config_json,
            updatedAt: new Date().toISOString(),
          }).where(eq(automations.id, row.id)).run();
        } else {
          db.insert(automations).values({
            id: row.id,
            name: row.name,
            enabled: row.enabled ?? true,
            triggerType: row.trigger_type,
            triggerConfigJson: row.trigger_config_json,
            actionType: row.action_type,
            actionConfigJson: row.action_config_json,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }).run();
        }
        importedAutomations++;
      }
    }

    // Import settings (skip sensitive keys)
    if (Array.isArray(body.settings)) {
      for (const row of body.settings) {
        if (!row.key || typeof row.value !== "string") continue;
        if (SENSITIVE_KEYS.includes(row.key)) continue;
        const existing = db.select().from(settings).where(eq(settings.key, row.key)).get();
        if (existing) {
          db.update(settings).set({ value: row.value }).where(eq(settings.key, row.key)).run();
        } else {
          db.insert(settings).values({ key: row.key, value: row.value }).run();
        }
        importedSettings++;
      }
    }

    systemLogger.info("Import completed", { automations: importedAutomations, settings: importedSettings });
    return Response.json({ success: true, imported: { automations: importedAutomations, settings: importedSettings } });
  } catch (e) {
    systemLogger.error("Import failed", { error: e instanceof Error ? e.message : String(e) });
    return Response.json({ error: "Import failed" }, { status: 500 });
  }
}
