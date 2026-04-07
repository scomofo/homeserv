# HomeServ – Codex Handoff: Automation Engine v1

## Goal
Implement a **real, shippable Automation Engine v1** for HomeServ.

This is a core product requirement.
Do not over-engineer it.

The goal is to ship a simple, reliable system that lets a user create automations like:
- When an MQTT topic matches a value → publish to another MQTT topic
- When an MQTT topic matches a value → call a Home Assistant service
- When a Home Assistant entity reaches a state → call another Home Assistant service
- When a Home Assistant entity reaches a state → Wake-on-LAN a device
- At a scheduled time → run one action

---

## Non-Goals (v1)
Do NOT build these yet:
- multi-step workflows
- branching logic
- nested conditions
- visual flow editor
- user-defined JavaScript
- automation history UI
- complex retry orchestration
- distributed workers

v1 is strictly:
- **one trigger**
- **optional simple condition/value match**
- **one action**

---

## Existing Project Context

Stack:
- Next.js App Router
- TypeScript
- SQLite via Drizzle ORM
- Home Assistant integration already exists
- MQTT integration already exists
- Wake-on-LAN already exists

Relevant files already in repo:
- `app/src/lib/schema.ts`
- `app/src/lib/db.ts`
- `app/src/lib/ha-client.ts`
- `app/src/lib/mqtt-client.ts`
- `app/src/lib/wol.ts`
- `app/src/app/settings/page.tsx`
- `app/src/app/api/ha/route.ts`
- `app/src/app/api/mqtt/route.ts`
- `app/src/app/api/wol/route.ts`

There is already an `automations` table in schema, but it is too generic (`triggerJson` and `actionJson`).
For v1, either:
1. extend it in-place if easy, or
2. replace it with a clearer structure

Prefer clarity over migration cleverness.

---

## Required Deliverables

### 1. Data Model
Create a durable schema for automations.

Use one table for v1.

Recommended table structure:
- `id` TEXT PRIMARY KEY
- `name` TEXT NOT NULL
- `enabled` INTEGER NOT NULL DEFAULT 1
- `trigger_type` TEXT NOT NULL
- `trigger_config_json` TEXT NOT NULL
- `action_type` TEXT NOT NULL
- `action_config_json` TEXT NOT NULL
- `last_run_at` TEXT NULL
- `last_result` TEXT NULL  // e.g. success, error, skipped
- `last_error` TEXT NULL
- `created_at` TEXT NOT NULL DEFAULT datetime('now')
- `updated_at` TEXT NOT NULL DEFAULT datetime('now')

If keeping the existing table is cleaner for this repo, that is acceptable, but the code must expose the structure above at the app layer.

---

### 2. Trigger Types (v1)
Support these trigger types:

#### `mqtt_message`
Config shape:
```json
{
  "topic": "home/livingroom/light/state",
  "matchType": "equals",
  "value": "ON"
}
```

Allowed `matchType` values:
- `equals`
- `contains`
- `exists`

#### `ha_state`
Config shape:
```json
{
  "entityId": "light.living_room",
  "matchType": "equals",
  "value": "on"
}
```

Allowed `matchType` values:
- `equals`
- `contains`
- `exists`

Implementation note:
- v1 may poll HA state periodically if websocket subscription is too much
- polling is acceptable for v1

#### `schedule`
Config shape:
```json
{
  "mode": "daily",
  "time": "22:30"
}
```

Allowed `mode` values for v1:
- `daily`
- `hourly`

For `hourly`, allow:
```json
{ "mode": "hourly", "minute": 15 }
```

Keep schedule support simple.

---

### 3. Action Types (v1)
Support these action types:

#### `mqtt_publish`
```json
{
  "topic": "home/livingroom/light/set",
  "message": "OFF"
}
```

#### `ha_service`
```json
{
  "domain": "light",
  "service": "turn_off",
  "data": {
    "entity_id": "light.living_room"
  }
}
```

#### `wol_wake`
```json
{
  "deviceId": "..."
}
```

---

## API Requirements

Create route:
- `app/src/app/api/automations/route.ts`

Support:

### `GET /api/automations`
Return all automations ordered by name or created date.

### `POST /api/automations`
Create automation.
Validate payload.

### `PUT /api/automations`
Update automation by id.
Allow updating:
- name
- enabled
- trigger config
- action config

### `DELETE /api/automations`
Delete automation by id.

All responses must be structured:
```json
{ "success": true }
```
or
```json
{ "error": "message" }
```

Do not silently fail.

---

## UI Requirements

Create page:
- `app/src/app/automations/page.tsx`

Add it to navigation.

### UI scope for v1
No fancy builder. Keep it clean and fast.

The page should support:
- list automations
- toggle enabled/disabled
- create automation
- edit automation
- delete automation

### Suggested UI structure
Top of page:
- title: `Automations`
- subtitle: `Simple rules for your server and smart home`
- button: `New Automation`

Automation list card shows:
- name
- trigger summary
- action summary
- enabled status
- last result / last error if present
- edit button
- delete button

### Create/Edit form
Support these fields:
- Name
- Trigger Type dropdown
- Trigger config fields based on selected type
- Action Type dropdown
- Action config fields based on selected type
- Enabled toggle

### Keep forms explicit
Do not build a schema-driven meta-form system.
Hardcode the small v1 form options.

---

## Runtime Engine Requirements

Create a dedicated service file:
- `app/src/lib/automation-engine.ts`

Responsibilities:
- load enabled automations
- subscribe to MQTT topics needed by enabled MQTT automations
- evaluate schedule triggers on interval
- evaluate HA state triggers on polling interval
- execute actions
- update last run/result/error state in DB

### Start-up
Create a small bootstrap helper and start it from safe server-side entry points.
Since this is a Next.js app and not a dedicated Node daemon, keep the approach pragmatic.

Recommended:
- expose `startAutomationEngine()`
- call it from `app/src/app/api/automations/route.ts`
- also call it from other server routes that are likely to be hit
- guard with singleton boolean so it only starts once per server process

This is acceptable for v1.

---

## Runtime Design

### MQTT triggers
Use existing `mqtt-client.ts` subscription support.

When automation engine starts:
- inspect enabled automations of type `mqtt_message`
- subscribe to their topics
- on incoming message:
  - evaluate match rule
  - if match, run action

Important:
- avoid duplicate subscriptions
- if automations change, refresh subscriptions

### HA triggers
Use polling for v1.

Recommended:
- every 15 seconds, inspect enabled `ha_state` automations
- fetch current state for each referenced entity
- compare with last-seen cached value
- only fire when the state transitions into a matching state, not on every poll forever

Example:
- if entity was `off`
- becomes `on`
- trigger fires once
- next polls while still `on` do not repeatedly fire

This edge-trigger behavior is important.

### Schedule triggers
Use a 30-second or 60-second interval.

Requirements:
- `daily` triggers run once per day at the configured local time
- `hourly` triggers run once per hour at the configured minute
- avoid duplicate runs within the same slot

You may track last execution in memory + DB.

---

## Validation Rules

Use Zod.

Create validation module:
- `app/src/lib/automation-validation.ts`

Validate:
- trigger type is allowed
- action type is allowed
- required fields exist
- time strings are valid for schedule mode
- hourly minute is 0–59
- MQTT topic is non-empty
- HA entityId is non-empty
- WOL deviceId is non-empty

Reject invalid payloads with 400.

---

## Suggested Types

Create shared types module:
- `app/src/lib/automation-types.ts`

Include:
- `Automation`
- `AutomationTriggerType`
- `AutomationActionType`
- `MqttMessageTriggerConfig`
- `HaStateTriggerConfig`
- `ScheduleTriggerConfig`
- `MqttPublishActionConfig`
- `HaServiceActionConfig`
- `WolWakeActionConfig`

---

## Suggested File Structure

Add:
- `app/src/lib/automation-types.ts`
- `app/src/lib/automation-validation.ts`
- `app/src/lib/automation-repo.ts`
- `app/src/lib/automation-engine.ts`
- `app/src/app/api/automations/route.ts`
- `app/src/app/automations/page.tsx`
- any small UI components under `app/src/components/automations/`

Keep modules small.

---

## Repository Layer

Create a small repository abstraction in:
- `app/src/lib/automation-repo.ts`

Functions recommended:
- `listAutomations()`
- `listEnabledAutomations()`
- `getAutomationById(id)`
- `createAutomation(input)`
- `updateAutomation(id, input)`
- `deleteAutomation(id)`
- `recordAutomationRun(id, result)`

Keep DB access out of route handlers when possible.

---

## Matching Behavior

### `equals`
String comparison after coercion to string.

### `contains`
String `.includes()` comparison.

### `exists`
- for MQTT: message payload is non-empty
- for HA: state exists and is non-empty

Keep behavior predictable.

---

## Action Execution Behavior

### MQTT publish
Use existing `publish(topic, message)`.
If MQTT is not connected, return a meaningful error and store it in `last_error`.

### HA service
Use existing Home Assistant client.
If HA is not configured or request fails, store error.

### WOL wake
Use existing `wakeDevice(deviceId)`.

---

## Error Handling

Requirements:
- No silent `catch {}` in automation code
- Log errors server-side
- Persist last error on automation row
- Do not crash the whole engine because one automation fails

---

## Idempotency / Duplicate Prevention

This is important.

### MQTT
If multiple identical messages arrive, it is okay to trigger multiple times.
That is expected event behavior.

### HA polling
Must avoid repeated firing while state remains the same.
Only trigger on entering the matching state.

### Schedule
Must avoid multiple runs within same minute slot.

---

## UX Notes

For v1, show human-readable summaries.

Examples:
- `When MQTT topic home/livingroom/light/state equals ON`
- `When light.living_room becomes on`
- `Every day at 22:30`
- `Then publish OFF to home/livingroom/light/set`
- `Then call light.turn_off`
- `Then wake Office PC`

A small helper module for summary strings is fine.

---

## Acceptance Criteria

The feature is done when all of these work:

### Create/edit/delete
- User can create automation from UI
- User can edit automation from UI
- User can enable/disable automation
- User can delete automation

### MQTT trigger
- Incoming MQTT message matching rule executes action

### HA trigger
- HA state transition into matching state executes action once

### Schedule trigger
- Daily and hourly schedule rules execute reliably without duplicate firing

### Actions
- MQTT publish works
- HA service call works
- WOL wake works

### Visibility
- List page shows last result and last error

### Stability
- Invalid automation payloads are rejected with clear errors
- One failed automation does not break others

---

## Implementation Order (Do This Order)

1. Add types
2. Add validation
3. Add DB/repository layer
4. Add `/api/automations`
5. Add runtime engine skeleton
6. Implement MQTT trigger runtime
7. Implement action execution
8. Implement HA polling trigger runtime
9. Implement schedule runtime
10. Build UI page
11. Add navigation link
12. Test all end-to-end flows

---

## Testing Checklist

Manual testing is acceptable if no test framework is in place yet.

Test cases:
- create valid MQTT → MQTT automation
- create valid MQTT → HA automation
- create valid HA → WOL automation
- create valid schedule → MQTT automation
- invalid payload rejected
- disabled automation does not run
- deleting automation removes it from runtime
- editing automation refreshes runtime subscriptions
- HA trigger fires once on transition, not repeatedly on every poll
- schedule trigger only runs once in its slot

---

## Important Product Note

This is the feature that upgrades HomeServ from a dashboard into a platform.

Prioritize:
1. reliability
2. clarity
3. end-to-end usability

Not abstraction.
Not future-proofing.
Not architecture purity.

Build the simplest version that feels real.
