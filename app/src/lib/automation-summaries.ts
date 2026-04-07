// app/src/lib/automation-summaries.ts
import type {
  TriggerType, TriggerConfig, ActionType, ActionConfig,
  MqttMessageTriggerConfig, HaStateTriggerConfig, ScheduleTriggerConfig,
  MqttPublishActionConfig, HaServiceActionConfig, WolWakeActionConfig,
} from "./automation-types";

export function triggerSummary(type: TriggerType, config: TriggerConfig): string {
  switch (type) {
    case "mqtt_message": {
      const c = config as MqttMessageTriggerConfig;
      if (c.matchType === "exists") return `When MQTT topic ${c.topic} receives any message`;
      return `When MQTT topic ${c.topic} ${c.matchType} "${c.value}"`;
    }
    case "ha_state": {
      const c = config as HaStateTriggerConfig;
      if (c.matchType === "exists") return `When ${c.entityId} has any state`;
      return `When ${c.entityId} ${c.matchType === "equals" ? "becomes" : "contains"} "${c.value}"`;
    }
    case "schedule": {
      const c = config as ScheduleTriggerConfig;
      if (c.mode === "daily") return `Every day at ${c.time}`;
      return `Every hour at :${String(c.minute).padStart(2, "0")}`;
    }
  }
}

export function actionSummary(type: ActionType, config: ActionConfig): string {
  switch (type) {
    case "mqtt_publish": {
      const c = config as MqttPublishActionConfig;
      return `Publish "${c.message}" to ${c.topic}`;
    }
    case "ha_service": {
      const c = config as HaServiceActionConfig;
      const entityId = c.data?.entity_id;
      return entityId
        ? `Call ${c.domain}.${c.service} on ${entityId}`
        : `Call ${c.domain}.${c.service}`;
    }
    case "wol_wake": {
      const c = config as WolWakeActionConfig;
      return `Wake device ${c.deviceId}`;
    }
  }
}
