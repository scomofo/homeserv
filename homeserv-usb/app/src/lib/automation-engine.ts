import { db } from "./db";
import { automations } from "./schema";
import { eq } from "drizzle-orm";
import { controlDevice } from "./device-manager";
import { publish } from "./mqtt-client";

export interface AutomationTrigger {
  type: "time" | "device_state" | "mqtt_message";
  // time trigger
  cron?: string;
  // device state trigger
  deviceId?: string;
  fromState?: string;
  toState?: string;
  // mqtt trigger
  topic?: string;
  payload?: string;
}

export interface AutomationAction {
  type: "device_control" | "mqtt_publish";
  // device control
  deviceId?: string;
  action?: string;
  params?: Record<string, unknown>;
  // mqtt publish
  topic?: string;
  message?: string;
}

export interface Automation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  enabled: boolean;
  createdAt: string;
}

export function getAutomations(): Automation[] {
  const rows = db.select().from(automations).all();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    trigger: JSON.parse(row.triggerJson) as AutomationTrigger,
    actions: JSON.parse(row.actionJson) as AutomationAction[],
    enabled: row.enabled,
    createdAt: row.createdAt,
  }));
}

export function createAutomation(auto: Omit<Automation, "id" | "createdAt">): string {
  const id = crypto.randomUUID();
  db.insert(automations).values({
    id,
    name: auto.name,
    triggerJson: JSON.stringify(auto.trigger),
    actionJson: JSON.stringify(auto.actions),
    enabled: auto.enabled,
  }).run();
  return id;
}

export function updateAutomation(id: string, updates: Partial<Omit<Automation, "id" | "createdAt">>): void {
  const setFields: Record<string, unknown> = {};
  if (updates.name !== undefined) setFields.name = updates.name;
  if (updates.trigger !== undefined) setFields.triggerJson = JSON.stringify(updates.trigger);
  if (updates.actions !== undefined) setFields.actionJson = JSON.stringify(updates.actions);
  if (updates.enabled !== undefined) setFields.enabled = updates.enabled;

  db.update(automations).set(setFields).where(eq(automations.id, id)).run();
}

export function deleteAutomation(id: string): void {
  db.delete(automations).where(eq(automations.id, id)).run();
}

export async function executeActions(actions: AutomationAction[]): Promise<void> {
  for (const action of actions) {
    try {
      switch (action.type) {
        case "device_control":
          if (action.deviceId && action.action) {
            await controlDevice(action.deviceId, action.action, action.params);
          }
          break;
        case "mqtt_publish":
          if (action.topic && action.message !== undefined) {
            publish(action.topic, action.message);
          }
          break;
      }
    } catch {
      // Continue executing remaining actions even if one fails
    }
  }
}

// Simple time-based automation runner
let timerStarted = false;

export function startAutomationRunner(): void {
  if (timerStarted) return;
  timerStarted = true;

  // Check every minute for time-based automations
  setInterval(() => {
    const now = new Date();
    const currentMinute = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const currentDay = now.getDay(); // 0=Sun, 6=Sat

    const allAutomations = getAutomations().filter((a) => a.enabled);

    for (const auto of allAutomations) {
      if (auto.trigger.type === "time" && auto.trigger.cron) {
        // Simple cron: "HH:MM" or "HH:MM:days" where days is "0,1,2,3,4,5,6"
        const parts = auto.trigger.cron.split(":");
        const triggerTime = `${parts[0]}:${parts[1]}`;
        const triggerDays = parts[2]?.split(",").map(Number);

        if (triggerTime === currentMinute) {
          if (!triggerDays || triggerDays.includes(currentDay)) {
            executeActions(auto.actions);
          }
        }
      }
    }
  }, 60_000);
}
