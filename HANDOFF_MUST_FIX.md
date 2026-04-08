# HomeServ – Must Fix Handoff

## Purpose
This handoff covers the **true launch blockers** that must be verified or fixed before HomeServ is called launch-ready.

This is not a redesign pass.
This is a **readiness pass**.

The goal is to prove that the current automation system is dependable in real use.

---

## Scope
Focus only on these four items:

1. MQTT auto-connect reliability
2. Schedule dedupe across restart
3. Migration safety
4. Engine bootstrap during normal usage

Do not broaden scope.
Do not add features.
Do not refactor unrelated code.

---

## 1. MQTT Auto-Connect Reliability

### Goal
Verify and, if needed, fix the current MQTT auto-connect behavior so MQTT-trigger automations work after app restart without requiring a user to visit MQTT settings or MQTT API routes.

### Required verification
Run this exact flow:
1. Configure MQTT settings
2. Create an enabled MQTT-trigger automation
3. Restart the app/server
4. Do **not** open `/settings`, `/api/mqtt`, or any MQTT-specific page
5. Send the matching MQTT message

### Expected result
- automation fires
- action executes
- automation run state updates in UI

### If it fails
Fix the engine so that:
- if at least one enabled `mqtt_message` automation exists
- and MQTT is configured
- the engine attempts MQTT connection automatically during startup/refresh

### Acceptance criteria
- MQTT-trigger automations work immediately after restart
- user does not need to manually prime MQTT elsewhere in the app
- failures are logged, but engine does not crash

---

## 2. Schedule Dedupe Across Restart

### Goal
Ensure scheduled automations do not fire twice in the same slot just because the process restarted.

### Required verification
#### Daily test
1. Create a daily automation for a time a few minutes ahead
2. Let it run once
3. Restart the server inside the same minute or shortly after
4. Observe behavior

Expected:
- does **not** run again for the same daily slot

#### Hourly test
1. Create an hourly automation for a specific minute
2. Let it run once at that minute
3. Restart server before the hour changes
4. Observe behavior

Expected:
- does **not** run again for the same hourly slot

### If it fails
Patch schedule execution logic so duplicate prevention uses persisted state such as `lastRunAt`, not only in-memory maps.

### Acceptance criteria
- scheduled automations are slot-safe across restart
- no duplicate firing for same daily/hourly slot

---

## 3. Migration Safety

### Goal
Ensure old/new automations schema handling does not destroy data.

### Required verification
Simulate a legacy or mismatched schema state and restart the app.

### Expected result
- no automation rows are silently deleted
- app either:
  - safely preserves the old table, or
  - creates a backup table, or
  - logs a warning and continues safely

### Required behavior
Under no condition should migration logic automatically drop a user’s automations table without preserving data.

### Acceptance criteria
- migration path is non-destructive
- app still boots on fresh install and upgraded install
- existing automation data remains recoverable

---

## 4. Engine Bootstrap During Normal Usage

### Goal
Ensure automation engine starts during normal app use, not only when the automations page/API is opened.

### Required verification
Run this exact flow:
1. Restart the app/server
2. Open only common app flows such as dashboard/system/devices/settings
3. Do **not** open automations page
4. Trigger a matching automation

### Expected result
- engine is already running
- automation executes

### If it fails
Broaden startup coverage by calling `startAutomationEngine()` from normal high-traffic server routes.

Recommended candidates:
- `app/src/app/api/system/sse/route.ts`
- `app/src/app/api/devices/route.ts`
- `app/src/app/api/settings/route.ts`

### Acceptance criteria
- engine starts during normal app usage
- repeated calls remain safe because singleton guard prevents duplicate startup

---

## Deliverable
Produce one small patch pass that does whichever of the following are needed:
- verification-only notes if behavior already passes
- minimal code changes where it does not

Document results in a short markdown summary:
- what was tested
- what passed as-is
- what was patched
- final outcome

---

## Definition of Done
This handoff is complete when all four items are proven true:
- MQTT automations self-start reliably
- schedules do not duplicate across restart
- migration is non-destructive
- engine starts during ordinary usage

At that point, HomeServ clears the **must-fix** gate for launch readiness.
