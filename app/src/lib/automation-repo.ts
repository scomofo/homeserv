// app/src/lib/automation-repo.ts
import { db } from "./db";
import { automations } from "./schema";
import { eq } from "drizzle-orm";
import type { Automation, AutomationInput, TriggerConfig, ActionConfig, TriggerType, ActionType } from "./automation-types";

function rowToAutomation(row: typeof automations.$inferSelect): Automation {
  return {
    id: row.id,
    name: row.name,
    enabled: row.enabled,
    triggerType: row.triggerType as TriggerType,
    triggerConfig: JSON.parse(row.triggerConfigJson) as TriggerConfig,
    actionType: row.actionType as ActionType,
    actionConfig: JSON.parse(row.actionConfigJson) as ActionConfig,
    lastRunAt: row.lastRunAt,
    lastResult: row.lastResult,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listAutomations(): Automation[] {
  const rows = db.select().from(automations).all();
  return rows.map(rowToAutomation);
}

export function listEnabledAutomations(): Automation[] {
  const rows = db.select().from(automations).where(eq(automations.enabled, true)).all();
  return rows.map(rowToAutomation);
}

export function getAutomationById(id: string): Automation | null {
  const row = db.select().from(automations).where(eq(automations.id, id)).get();
  return row ? rowToAutomation(row) : null;
}

export function createAutomation(input: AutomationInput): string {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.insert(automations).values({
    id,
    name: input.name,
    enabled: input.enabled,
    triggerType: input.triggerType,
    triggerConfigJson: JSON.stringify(input.triggerConfig),
    actionType: input.actionType,
    actionConfigJson: JSON.stringify(input.actionConfig),
    createdAt: now,
    updatedAt: now,
  }).run();
  return id;
}

export function updateAutomation(id: string, input: Partial<AutomationInput>): void {
  const setFields: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (input.name !== undefined) setFields.name = input.name;
  if (input.enabled !== undefined) setFields.enabled = input.enabled;
  if (input.triggerType !== undefined) setFields.triggerType = input.triggerType;
  if (input.triggerConfig !== undefined) setFields.triggerConfigJson = JSON.stringify(input.triggerConfig);
  if (input.actionType !== undefined) setFields.actionType = input.actionType;
  if (input.actionConfig !== undefined) setFields.actionConfigJson = JSON.stringify(input.actionConfig);

  db.update(automations).set(setFields).where(eq(automations.id, id)).run();
}

export function deleteAutomation(id: string): void {
  db.delete(automations).where(eq(automations.id, id)).run();
}

export function recordAutomationRun(id: string, result: "success" | "error" | "skipped", error?: string): void {
  db.update(automations).set({
    lastRunAt: new Date().toISOString(),
    lastResult: result,
    lastError: error || null,
    updatedAt: new Date().toISOString(),
  }).where(eq(automations.id, id)).run();
}
