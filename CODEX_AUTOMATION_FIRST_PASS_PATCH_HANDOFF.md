# HomeServ – Codex Handoff: Automation Engine First-Pass Patch Plan

## Purpose
This handoff is for the **second pass** on the HomeServ automation engine.

The first pass is good and should be preserved.
Do **not** rewrite it from scratch.
This pass is about fixing the most important correctness and reliability issues without expanding scope.

Primary goal:
- make the current automation implementation reliable enough for real use
- keep v1 simple
- avoid architectural detours

---

## What Already Exists
The current implementation already includes:
- automation types
- Zod validation
- repository layer
- API CRUD
- runtime engine
- UI page
- summaries
- sidebar navigation

Do not replace these unless necessary.
Patch them surgically.

Relevant files:
- `app/src/lib/automation-types.ts`
- `app/src/lib/automation-validation.ts`
- `app/src/lib/automation-repo.ts`
- `app/src/lib/automation-engine.ts`
- `app/src/app/api/automations/route.ts`
- `app/src/app/automations/page.tsx`
- `app/src/lib/automation-summaries.ts`
- `app/src/lib/db.ts`
- `app/src/lib/mqtt-client.ts`

---

## Priority Order
Implement in this exact order:

1. Fix MQTT automation startup reliability
2. Remove destructive automations migration behavior
3. Make schedule dedupe DB-aware
4. Improve automation engine bootstrap coverage
5. Stop rebuilding MQTT subscriptions every loop
6. Improve automation page error handling
7. Fix HA service JSON input UX in the form

Do not jump ahead.

---

# 1. Fix MQTT Automation Startup Reliability

## Problem
MQTT-trigger automations currently depend on MQTT already being connected.
If MQTT is configured but not yet connected, MQTT automations may never run.

## Required change
In `app/src/lib/automation-engine.ts`:
- import `connectMqtt` and `isMqttConfigured` from `mqtt-client`
- before setting up MQTT subscriptions, check whether there are enabled `mqtt_message` automations
- if there are, and MQTT is configured, call `connectMqtt()`
- then continue setup logic

## Requirements
- do not require a user to visit the MQTT page first
- do not throw if MQTT is configured but connection fails
- log connection/setup issues clearly
- engine should continue running even if MQTT is temporarily unavailable

## Acceptance criteria
- if MQTT is configured and at least one enabled MQTT automation exists, the automation engine attempts MQTT connection automatically
- MQTT-trigger automations work without visiting `/settings` or `/api/mqtt`

---

# 2. Remove Destructive Automations Migration

## Problem
`db.ts` currently drops the `automations` table if it detects the old schema.
That is destructive and can erase data.

## Required change
In `app/src/lib/db.ts`:
- remove the destructive `DROP TABLE automations` migration path
- replace with a non-destructive approach

## Acceptable implementation options
### Option A (preferred)
If old schema detected:
- rename old table to `automations_legacy_backup`
- create new table with new schema if needed
- do not try to auto-transform old records unless mapping is safe

### Option B
If old schema detected:
- leave table untouched and log a warning that manual migration is required
- do not destroy data

## Requirements
- do not delete existing automation rows automatically
- code must be safe for a user who already has automation data

## Acceptance criteria
- old table detection does not destroy data
- app still boots
- new installs still get the new automations table

---

# 3. Make Schedule Dedupe DB-Aware

## Problem
Schedule duplicate prevention currently uses only in-memory tracking.
That means a process restart can allow duplicate runs inside the same slot.

## Required change
Use the automation row’s `lastRunAt` to prevent duplicate schedule execution in the same time slot.

## Recommended approach
In `app/src/lib/automation-engine.ts`:
- keep in-memory cache if helpful for performance
- but before executing a schedule action, also inspect `auto.lastRunAt`
- determine whether `lastRunAt` is already inside the current daily/hourly slot
- if yes, skip

## Slot rules
### Daily
If schedule is `daily` at `22:30`:
- once it runs for that calendar date at that slot, do not run again until next day

### Hourly
If schedule is `hourly` at minute `15`:
- once it runs for that hour’s `:15` slot, do not run again until next hour

## Notes
- use local server time, consistent with current schedule behavior
- keep implementation simple and readable

## Acceptance criteria
- scheduled automations do not duplicate just because server process restarted during the same slot

---

# 4. Improve Automation Engine Bootstrap Coverage

## Problem
The engine is currently started from `/api/automations`, which is too narrow.
If nobody hits that route, the engine may never start.

## Required change
Keep the current bootstrap, but broaden it pragmatically.

## Recommended approach
Call `startAutomationEngine()` from additional high-traffic server routes such as:
- `app/src/app/api/devices/route.ts`
- `app/src/app/api/system/sse/route.ts`
- `app/src/app/api/settings/route.ts`

You do not need to call it everywhere.
Just ensure it gets hit during normal app usage.

## Requirements
- retain singleton guard in engine
- safe to call repeatedly
- no behavioral change if already started

## Acceptance criteria
- engine starts during normal app use even if user never opens the automations page

---

# 5. Stop Rebuilding MQTT Subscriptions Every Loop

## Problem
The engine currently unsubscribes and resubscribes all MQTT topics every loop.
That is noisy and can miss messages.

## Required change
Track active MQTT topic subscriptions and only update when the required topic set changes.

## Recommended implementation
In `app/src/lib/automation-engine.ts`:
- replace the simple `mqttUnsubs` array with a topic-based registry, e.g.:
  - `Map<string, () => void>` for topic unsubscribers
- on refresh:
  - compute desired topics from enabled MQTT automations
  - unsubscribe topics no longer needed
  - subscribe to new topics not already active
- keep per-topic callback behavior working for multiple automations on the same topic

## Important
Do not create duplicate subscriptions for the same topic.
If multiple automations use one topic:
- one subscription is enough
- incoming message can then be matched against all relevant automations for that topic

## Acceptance criteria
- MQTT subscriptions are stable across engine loops
- topic changes after automation create/edit/delete are reflected correctly

---

# 6. Improve Automation Page Error Handling

## Problem
The automations page suppresses fetch failures too aggressively.
Users can end up with empty or confusing state.

## Required change
In `app/src/app/automations/page.tsx`:
- add a dedicated load error state for initial fetch / refresh failures
- render a visible error banner/card when list loading fails
- keep create/edit form error handling as-is unless small improvements are needed

## Requirements
- do not silently ignore list fetch failures
- refresh button should still work
- loading state and error state should be distinct

## Acceptance criteria
- if `/api/automations` fails, user sees a meaningful message

---

# 7. Fix HA Service JSON Input UX

## Problem
The HA service action `data` field currently parses JSON on every keystroke and resets to `{}` on invalid JSON.
This is frustrating while typing.

## Required change
In `app/src/app/automations/page.tsx`:
- keep a raw text value for HA action JSON input while editing
- only parse JSON on save
- surface parse errors clearly to the user

## Requirements
- user must be able to type partial JSON without losing input
- invalid JSON must block save with a clear error message
- valid JSON should be stored as object in `actionConfig.data`

## Suggested approach
Because only HA action needs this special behavior, keep it local and explicit.
Do not build a generic form framework.

A practical approach:
- extend form state with `haServiceDataText?: string`
- on edit, initialize it from existing `actionConfig.data`
- on save, if actionType is `ha_service`, parse `haServiceDataText`
- if parse fails, set form error and abort save

## Acceptance criteria
- typing JSON feels normal
- malformed JSON shows an error instead of silently becoming `{}`

---

## Additional Guidance

### Do not change these unless necessary
- current validation structure
- current CRUD API shape
- current summaries
- current trigger/action types

### Keep scope locked
Do not add:
- automation history table
n- retry policies
- advanced scheduling
- websocket HA integration
- multi-action workflows
- expression builders

This is a patch pass, not a v2.

---

## Suggested File-by-File Changes

### `app/src/lib/automation-engine.ts`
Implement:
- MQTT auto-connect
- DB-aware schedule dedupe
- stable topic subscription diffing
- better logging around setup/refresh

### `app/src/lib/db.ts`
Implement:
- safe, non-destructive migration behavior

### `app/src/app/api/automations/route.ts`
Keep mostly unchanged unless minor improvements needed

### `app/src/app/api/devices/route.ts`
Add:
- `startAutomationEngine()` call near start of handler(s)

### `app/src/app/api/system/sse/route.ts`
Add:
- `startAutomationEngine()` call near start of `GET`

### `app/src/app/api/settings/route.ts`
Add:
- `startAutomationEngine()` call near start of `GET` and/or `POST`

### `app/src/app/automations/page.tsx`
Implement:
- fetch/load error state
- raw HA JSON text editing
- parse-on-save behavior

---

## Acceptance Checklist

All of the following must be true:

### MQTT
- MQTT-trigger automations auto-start when MQTT is configured
- no need to visit MQTT page first
- subscriptions are not torn down and rebuilt every engine loop

### Migration safety
- old automations schema detection does not delete user data

### Schedules
- schedule automations do not duplicate in same slot after restart

### Bootstrap
- engine starts during normal app usage without requiring automations page

### UI
- automations list fetch failures are visible
- HA action JSON field does not wipe user input while typing
- invalid HA JSON blocks save with clear error

---

## Final Instruction
Implement this as a **small, targeted patch pass**.
Do not refactor unrelated parts of HomeServ.
Do not over-abstract.
Do not broaden feature scope.

Preserve the good first-pass work and make it dependable.
