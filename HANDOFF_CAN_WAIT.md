# HomeServ – Can Wait Handoff

## Purpose
This handoff covers **post-launch improvements and leverage features**.

These are not required for launch and should not delay shipping.

---

## Scope
Focus on:
1. Automation UX upgrades
2. Advanced automation features
3. Performance and scaling enhancements

---

## 1. Automation Templates (High Impact UX)

### Goal
Make automation creation faster and more approachable.

### Examples
- Turn off all lights at midnight
- Wake PC on network activity
- Shutdown system on temperature threshold

### Implementation
- add preset templates in UI
- pre-fill form values

---

## 2. Multi-Action Automations

### Goal
Allow a single trigger to execute multiple actions.

### v2 concept
- actions: array instead of single object
- execute sequentially

### Constraint
- keep v1 unchanged
- introduce only after stability proven

---

## 3. HA WebSocket Integration

### Goal
Replace polling with real-time updates

### Notes
- use HA websocket API
- subscribe to state changes

### Constraint
- do not implement before launch
- current polling is acceptable

---

## 4. Automation History / Logs

### Goal
Provide visibility into past automation runs

### Implementation
- separate table for execution history
- UI list or timeline

---

## 5. Advanced Scheduling

### Future options
- cron expressions
- weekdays/weekends
- time ranges

---

## Definition of Done
These are complete when:
- automation creation is faster and more intuitive
- system supports more complex workflows
- performance scales beyond single-user scenarios

---

## Important Note
None of these should block launch.

Shipping a simple, reliable system is more valuable than adding complexity early.
