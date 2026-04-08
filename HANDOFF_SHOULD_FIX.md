# HomeServ – Should Fix Handoff

## Purpose
This handoff covers **important improvements** that increase reliability, UX, and scalability but are not launch blockers.

These should be completed shortly after launch or in parallel if low effort.

---

## Scope
Focus on:
1. MQTT subscription efficiency
2. HA polling performance
3. UI feedback and clarity

---

## 1. MQTT Subscription Efficiency

### Problem
Subscriptions may be rebuilt too frequently, causing unnecessary churn and potential missed messages.

### Goal
Make MQTT subscriptions stable and only update when required.

### Implementation
- Track active subscriptions by topic
- Compute desired topics from enabled automations
- Diff current vs desired
- Only:
  - subscribe to new topics
  - unsubscribe removed topics

### Acceptance criteria
- no redundant subscribe/unsubscribe cycles
- no duplicate subscriptions per topic
- automations still react correctly to changes

---

## 2. HA Polling Performance

### Problem
HA state checks may be sequential, which can become slow as automations grow.

### Goal
Improve performance without adding complexity.

### Implementation
- group HA state requests
- use `Promise.all` for concurrent fetches

### Constraints
- do not introduce websocket-based HA integration yet
- keep polling model intact

### Acceptance criteria
- reduced latency when multiple HA automations exist
- behavior unchanged

---

## 3. UI Feedback Improvements

### Problem
Some UI states are too silent or minimal.

### Improvements
- show clear error banner if automations fail to load
- improve loading state clarity
- optionally show relative time for last run

### Acceptance criteria
- user always understands system state
- no silent failures in main automations view

---

## Definition of Done
These are complete when:
- MQTT subscriptions are stable
- HA polling is efficient for moderate scale
- UI provides clear feedback

---

## Note
These improvements increase perceived quality significantly but do not block launch.
