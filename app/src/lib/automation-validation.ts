// app/src/lib/automation-validation.ts
import { z } from "zod";

const mqttMessageTriggerSchema = z.object({
  topic: z.string().min(1, "MQTT topic required"),
  matchType: z.enum(["equals", "contains", "exists"]),
  value: z.string().optional(),
}).refine(
  (d) => d.matchType === "exists" || (d.value !== undefined && d.value !== ""),
  { message: "value required for equals/contains match type" }
);

const haStateTriggerSchema = z.object({
  entityId: z.string().min(1, "HA entity ID required"),
  matchType: z.enum(["equals", "contains", "exists"]),
  value: z.string().optional(),
}).refine(
  (d) => d.matchType === "exists" || (d.value !== undefined && d.value !== ""),
  { message: "value required for equals/contains match type" }
);

const scheduleTriggerSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("daily"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "time must be HH:MM format"),
  }),
  z.object({
    mode: z.literal("hourly"),
    minute: z.number().int().min(0).max(59),
  }),
]);

const mqttPublishActionSchema = z.object({
  topic: z.string().min(1, "MQTT topic required"),
  message: z.string(),
});

const haServiceActionSchema = z.object({
  domain: z.string().min(1, "HA domain required"),
  service: z.string().min(1, "HA service required"),
  data: z.record(z.string(), z.unknown()).optional(),
});

const wolWakeActionSchema = z.object({
  deviceId: z.string().min(1, "WOL device ID required"),
});

const triggerConfigSchemas = {
  mqtt_message: mqttMessageTriggerSchema,
  ha_state: haStateTriggerSchema,
  schedule: scheduleTriggerSchema,
} as const;

const actionConfigSchemas = {
  mqtt_publish: mqttPublishActionSchema,
  ha_service: haServiceActionSchema,
  wol_wake: wolWakeActionSchema,
} as const;

export const automationInputSchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  enabled: z.boolean(),
  triggerType: z.enum(["mqtt_message", "ha_state", "schedule"]),
  triggerConfig: z.unknown(),
  actionType: z.enum(["mqtt_publish", "ha_service", "wol_wake"]),
  actionConfig: z.unknown(),
}).superRefine((data, ctx) => {
  const triggerSchema = triggerConfigSchemas[data.triggerType];
  const triggerResult = triggerSchema.safeParse(data.triggerConfig);
  if (!triggerResult.success) {
    for (const issue of triggerResult.error.issues) {
      ctx.addIssue({
        ...issue,
        path: ["triggerConfig", ...issue.path],
      });
    }
  }

  const actionSchema = actionConfigSchemas[data.actionType];
  const actionResult = actionSchema.safeParse(data.actionConfig);
  if (!actionResult.success) {
    for (const issue of actionResult.error.issues) {
      ctx.addIssue({
        ...issue,
        path: ["actionConfig", ...issue.path],
      });
    }
  }
});

export type AutomationInputParsed = z.infer<typeof automationInputSchema>;
