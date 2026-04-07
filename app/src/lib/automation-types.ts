// app/src/lib/automation-types.ts

// --- Trigger configs ---

export interface MqttMessageTriggerConfig {
  topic: string;
  matchType: "equals" | "contains" | "exists";
  value?: string;
}

export interface HaStateTriggerConfig {
  entityId: string;
  matchType: "equals" | "contains" | "exists";
  value?: string;
}

export interface ScheduleTriggerConfig {
  mode: "daily" | "hourly";
  time?: string;
  minute?: number;
}

export type TriggerType = "mqtt_message" | "ha_state" | "schedule";

export type TriggerConfig =
  | MqttMessageTriggerConfig
  | HaStateTriggerConfig
  | ScheduleTriggerConfig;

// --- Action configs ---

export interface MqttPublishActionConfig {
  topic: string;
  message: string;
}

export interface HaServiceActionConfig {
  domain: string;
  service: string;
  data?: Record<string, unknown>;
}

export interface WolWakeActionConfig {
  deviceId: string;
}

export type ActionType = "mqtt_publish" | "ha_service" | "wol_wake";

export type ActionConfig =
  | MqttPublishActionConfig
  | HaServiceActionConfig
  | WolWakeActionConfig;

// --- Automation record ---

export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  actionType: ActionType;
  actionConfig: ActionConfig;
  lastRunAt: string | null;
  lastResult: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationInput {
  name: string;
  enabled: boolean;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  actionType: ActionType;
  actionConfig: ActionConfig;
}
