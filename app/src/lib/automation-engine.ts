// app/src/lib/automation-engine.ts
import { listEnabledAutomations, recordAutomationRun } from "./automation-repo";
import { subscribe as mqttSubscribe, publish as mqttPublish, getMqttStatus, connectMqtt, isMqttConfigured } from "./mqtt-client";
import { getHAState, callHAService, isHAConfigured } from "./ha-client";
import { wakeDevice } from "./wol";
import type {
  Automation, MqttMessageTriggerConfig, HaStateTriggerConfig,
  ScheduleTriggerConfig, MqttPublishActionConfig, HaServiceActionConfig,
  WolWakeActionConfig,
} from "./automation-types";

let engineStarted = false;

// Stable MQTT subscription registry: topic -> unsub function
// Only changes when the set of required topics changes
const activeMqttSubs = new Map<string, () => void>();

// Track HA entity states for edge-trigger detection (only fire on transition)
const haLastStates = new Map<string, string>();

// In-memory schedule dedupe cache (supplements DB check for performance)
const scheduleLastFired = new Map<string, string>();

// --- Matching ---

function matchValue(matchType: "equals" | "contains" | "exists", actual: string, expected?: string): boolean {
  switch (matchType) {
    case "exists":
      return actual !== "" && actual !== undefined && actual !== null;
    case "equals":
      return actual === expected;
    case "contains":
      return expected !== undefined && actual.includes(expected);
  }
}

// --- Action Execution ---

async function executeAction(auto: Automation): Promise<void> {
  try {
    switch (auto.actionType) {
      case "mqtt_publish": {
        const c = auto.actionConfig as MqttPublishActionConfig;
        mqttPublish(c.topic, c.message);
        break;
      }
      case "ha_service": {
        const c = auto.actionConfig as HaServiceActionConfig;
        await callHAService(c.domain, c.service, c.data);
        break;
      }
      case "wol_wake": {
        const c = auto.actionConfig as WolWakeActionConfig;
        await wakeDevice(c.deviceId);
        break;
      }
    }
    recordAutomationRun(auto.id, "success");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recordAutomationRun(auto.id, "error", message);
    console.error(`[automation] "${auto.name}" action failed:`, message);
  }
}

// --- MQTT Trigger Runtime (Patch 1 + 5: auto-connect + stable subscriptions) ---

// Collect all enabled MQTT automations for a given topic
function buildMqttCallback(topic: string, autos: Automation[]): (_topic: string, message: string) => void {
  const relevantAutos = autos.filter((a) => {
    if (a.triggerType !== "mqtt_message") return false;
    return (a.triggerConfig as MqttMessageTriggerConfig).topic === topic;
  });

  return (_t: string, message: string) => {
    for (const auto of relevantAutos) {
      const config = auto.triggerConfig as MqttMessageTriggerConfig;
      if (matchValue(config.matchType, message, config.value)) {
        executeAction(auto);
      }
    }
  };
}

function setupMqttSubscriptions(autos: Automation[]): void {
  const mqttAutos = autos.filter((a) => a.triggerType === "mqtt_message");

  // Patch 1: Auto-connect MQTT if configured and there are MQTT automations
  if (mqttAutos.length > 0 && isMqttConfigured() && !getMqttStatus().connected) {
    try {
      connectMqtt();
      console.log("[automation] Auto-connected MQTT for automation triggers");
    } catch (err) {
      console.error("[automation] MQTT auto-connect failed:", err instanceof Error ? err.message : err);
    }
  }

  if (!getMqttStatus().connected) return;

  // Patch 5: Compute desired topics and diff against active subscriptions
  const desiredTopics = new Set(
    mqttAutos.map((a) => (a.triggerConfig as MqttMessageTriggerConfig).topic)
  );

  // Unsubscribe topics no longer needed
  for (const [topic, unsub] of activeMqttSubs) {
    if (!desiredTopics.has(topic)) {
      try { unsub(); } catch { /* ignore */ }
      activeMqttSubs.delete(topic);
    }
  }

  // Subscribe to new topics (and rebuild callbacks for existing ones to pick up automation changes)
  for (const topic of desiredTopics) {
    // Always rebuild callback to reflect current automation set
    const existingUnsub = activeMqttSubs.get(topic);
    if (existingUnsub) {
      try { existingUnsub(); } catch { /* ignore */ }
    }
    const callback = buildMqttCallback(topic, autos);
    const unsub = mqttSubscribe(topic, callback);
    activeMqttSubs.set(topic, unsub);
  }
}

// --- HA State Trigger Runtime ---

async function evaluateHaTriggers(autos: Automation[]): Promise<void> {
  if (!isHAConfigured()) return;

  const haAutos = autos.filter((a) => a.triggerType === "ha_state");
  if (haAutos.length === 0) return;

  for (const auto of haAutos) {
    const config = auto.triggerConfig as HaStateTriggerConfig;
    try {
      const entity = await getHAState(config.entityId);
      const currentState = entity.state;
      const previousState = haLastStates.get(`${auto.id}:${config.entityId}`);

      // Always update tracked state
      haLastStates.set(`${auto.id}:${config.entityId}`, currentState);

      // Skip first poll (no previous state to compare) — avoid firing on startup
      if (previousState === undefined) continue;

      // Edge trigger: only fire when state transitions INTO a matching state
      const wasMatching = matchValue(config.matchType, previousState, config.value);
      const isMatching = matchValue(config.matchType, currentState, config.value);

      if (!wasMatching && isMatching) {
        await executeAction(auto);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[automation] HA poll failed for "${auto.name}":`, message);
    }
  }
}

// --- Schedule Trigger Runtime (Patch 3: DB-aware dedupe) ---

function isInCurrentSlot(lastRunAt: string, config: ScheduleTriggerConfig): boolean {
  const lastRun = new Date(lastRunAt);
  const now = new Date();

  if (config.mode === "daily") {
    // Same calendar date and same time slot
    return lastRun.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
  } else {
    // Same hour
    return lastRun.toISOString().slice(0, 13) === now.toISOString().slice(0, 13);
  }
}

function evaluateScheduleTriggers(autos: Automation[]): void {
  const now = new Date();
  const currentHour = now.getHours().toString().padStart(2, "0");
  const currentMinute = now.getMinutes().toString().padStart(2, "0");
  const currentTime = `${currentHour}:${currentMinute}`;

  const scheduleAutos = autos.filter((a) => a.triggerType === "schedule");

  for (const auto of scheduleAutos) {
    const config = auto.triggerConfig as ScheduleTriggerConfig;
    let shouldFire = false;
    let slotKey = "";

    if (config.mode === "daily") {
      shouldFire = config.time === currentTime;
      slotKey = `${auto.id}:${now.toISOString().slice(0, 10)}:${config.time}`;
    } else if (config.mode === "hourly") {
      shouldFire = config.minute === now.getMinutes();
      slotKey = `${auto.id}:${now.toISOString().slice(0, 13)}:${config.minute}`;
    }

    if (!shouldFire) continue;

    // In-memory dedupe (fast path)
    if (scheduleLastFired.has(slotKey)) continue;

    // DB-aware dedupe: check lastRunAt to survive process restarts
    if (auto.lastRunAt && isInCurrentSlot(auto.lastRunAt, config)) continue;

    scheduleLastFired.set(slotKey, now.toISOString());
    executeAction(auto);

    // Clean old slot keys (keep last 100)
    if (scheduleLastFired.size > 100) {
      const keys = Array.from(scheduleLastFired.keys());
      for (let i = 0; i < keys.length - 50; i++) {
        scheduleLastFired.delete(keys[i]);
      }
    }
  }
}

// --- Engine Lifecycle ---

let pollInterval: ReturnType<typeof setInterval> | null = null;

function runEngineLoop(): void {
  const enabledAutos = listEnabledAutomations();

  // Refresh MQTT subscriptions (stable diff, not teardown/rebuild)
  setupMqttSubscriptions(enabledAutos);

  // Evaluate HA state triggers
  evaluateHaTriggers(enabledAutos);

  // Evaluate schedule triggers
  evaluateScheduleTriggers(enabledAutos);
}

export function startAutomationEngine(): void {
  if (engineStarted) return;
  engineStarted = true;

  console.log("[automation] Engine started");

  // Initial run after short delay to let services initialize
  setTimeout(runEngineLoop, 2000);

  // Run every 30 seconds
  pollInterval = setInterval(runEngineLoop, 30_000);
}

export function refreshAutomationEngine(): void {
  if (!engineStarted) return;
  runEngineLoop();
}

export function stopAutomationEngine(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  for (const [, unsub] of activeMqttSubs) {
    try { unsub(); } catch { /* ignore */ }
  }
  activeMqttSubs.clear();
  engineStarted = false;
  console.log("[automation] Engine stopped");
}
