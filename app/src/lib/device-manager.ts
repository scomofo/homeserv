import { db } from "./db";
import { devices } from "./schema";
import { eq } from "drizzle-orm";
import { getHAStates, callHAService, isHAConfigured, type HAEntity } from "./ha-client";
import { getLatestValue, isMqttConfigured } from "./mqtt-client";

export interface UnifiedDevice {
  id: string;
  name: string;
  type: "light" | "switch" | "thermostat" | "sensor" | "lock" | "cover" | "fan" | "media_player" | "other";
  room: string | null;
  source: "ha" | "mqtt" | "direct";
  state: Record<string, unknown>;
  available: boolean;
  lastSeen: string | null;
  sourceId: string; // entity_id for HA, topic for MQTT
}

function haEntityToDevice(entity: HAEntity): UnifiedDevice {
  const domain = entity.entity_id.split(".")[0];
  const friendlyName = (entity.attributes.friendly_name as string) || entity.entity_id;
  const room = (entity.attributes.room as string) || null;

  let type: UnifiedDevice["type"];
  switch (domain) {
    case "light": type = "light"; break;
    case "switch": type = "switch"; break;
    case "climate": type = "thermostat"; break;
    case "sensor":
    case "binary_sensor": type = "sensor"; break;
    case "lock": type = "lock"; break;
    case "cover": type = "cover"; break;
    case "fan": type = "fan"; break;
    case "media_player": type = "media_player"; break;
    default: type = "other";
  }

  const state: Record<string, unknown> = {
    state: entity.state,
    ...entity.attributes,
  };

  return {
    id: `ha_${entity.entity_id}`,
    name: friendlyName,
    type,
    room,
    source: "ha",
    state,
    available: entity.state !== "unavailable",
    lastSeen: entity.last_updated,
    sourceId: entity.entity_id,
  };
}

export async function getAllDevices(): Promise<UnifiedDevice[]> {
  const allDevices: UnifiedDevice[] = [];

  // Fetch from Home Assistant
  if (isHAConfigured()) {
    try {
      const entities = await getHAStates();
      const deviceEntities = entities.filter((e) => {
        const domain = e.entity_id.split(".")[0];
        return [
          "light", "switch", "sensor", "binary_sensor", "climate",
          "lock", "cover", "fan", "media_player",
        ].includes(domain);
      });

      for (const entity of deviceEntities) {
        const device = haEntityToDevice(entity);

        // Check for overrides in DB (room assignment, name override)
        const dbDevice = db.select().from(devices).where(eq(devices.id, device.id)).get();
        if (dbDevice) {
          if (dbDevice.room) device.room = dbDevice.room;
          if (dbDevice.name !== device.name) device.name = dbDevice.name;
        }

        allDevices.push(device);
      }
    } catch {
      // HA unavailable, skip
    }
  }

  // Fetch MQTT devices from DB (manually configured)
  if (isMqttConfigured()) {
    const mqttDevices = db.select().from(devices).where(eq(devices.source, "mqtt")).all();
    for (const d of mqttDevices) {
      const config = d.configJson ? JSON.parse(d.configJson) : {};
      const stateTopic = config.state_topic as string | undefined;
      const latestValue = stateTopic ? getLatestValue(stateTopic) : null;

      allDevices.push({
        id: d.id,
        name: d.name,
        type: d.type as UnifiedDevice["type"],
        room: d.room,
        source: "mqtt",
        state: latestValue ? { state: latestValue, ...(d.stateJson ? JSON.parse(d.stateJson) : {}) } : {},
        available: latestValue !== null,
        lastSeen: d.lastSeen,
        sourceId: stateTopic || d.id,
      });
    }
  }

  // Fetch direct API devices from DB
  const directDevices = db.select().from(devices).where(eq(devices.source, "direct")).all();
  for (const d of directDevices) {
    allDevices.push({
      id: d.id,
      name: d.name,
      type: d.type as UnifiedDevice["type"],
      room: d.room,
      source: "direct",
      state: d.stateJson ? JSON.parse(d.stateJson) : {},
      available: true,
      lastSeen: d.lastSeen,
      sourceId: d.id,
    });
  }

  return allDevices;
}

export async function controlDevice(
  deviceId: string,
  action: string,
  params?: Record<string, unknown>
): Promise<void> {
  if (deviceId.startsWith("ha_")) {
    const entityId = deviceId.replace("ha_", "");
    const domain = entityId.split(".")[0];

    let service: string;
    const serviceData: Record<string, unknown> = { entity_id: entityId };

    switch (action) {
      case "toggle": service = "toggle"; break;
      case "turn_on": service = "turn_on"; break;
      case "turn_off": service = "turn_off"; break;
      case "set_brightness":
        service = "turn_on";
        serviceData.brightness_pct = params?.brightness;
        break;
      case "set_temperature":
        service = "set_temperature";
        serviceData.temperature = params?.temperature;
        break;
      case "lock": service = "lock"; break;
      case "unlock": service = "unlock"; break;
      default: service = action;
    }

    await callHAService(domain, service, serviceData);
    return;
  }

  // MQTT device control
  const dbDevice = db.select().from(devices).where(eq(devices.id, deviceId)).get();
  if (dbDevice && dbDevice.source === "mqtt") {
    const config = dbDevice.configJson ? JSON.parse(dbDevice.configJson) : {};
    const commandTopic = config.command_topic as string | undefined;
    if (commandTopic) {
      const { publish } = await import("./mqtt-client");
      const message = params?.message ? String(params.message) : action === "turn_on" ? "ON" : "OFF";
      publish(commandTopic, message);
    }
    return;
  }

  throw new Error(`Cannot control device ${deviceId}`);
}

export function updateDeviceOverride(
  deviceId: string,
  updates: { name?: string; room?: string }
): void {
  const existing = db.select().from(devices).where(eq(devices.id, deviceId)).get();

  if (existing) {
    const setFields: Record<string, string> = {};
    if (updates.name !== undefined) setFields.name = updates.name;
    if (updates.room !== undefined) setFields.room = updates.room;
    db.update(devices).set(setFields).where(eq(devices.id, deviceId)).run();
  } else {
    db.insert(devices).values({
      id: deviceId,
      name: updates.name || deviceId,
      type: "other",
      room: updates.room || null,
      source: deviceId.startsWith("ha_") ? "ha" : "mqtt",
    }).run();
  }
}
