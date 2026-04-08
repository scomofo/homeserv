# HomeServ – Final Patch Handoff: Timezone-Safe Schedule Dedupe

## Purpose
This is a **small final patch** to make schedule deduplication consistent and safe.

Current state:
- schedule matching uses **local server time**
- dedupe slot comparison uses **UTC / `toISOString()`**

That mismatch can cause incorrect duplicate prevention or skipped runs near day/hour boundaries.

This patch should be **tiny and surgical**.
Do not refactor unrelated automation logic.

---

## Problem
In `app/src/lib/automation-engine.ts`:
- schedule trigger matching currently uses local time via `getHours()` and `getMinutes()`
- `isInCurrentSlot()` currently compares dates/hours using `toISOString()`

This means the system is using **two different time bases**.

For example:
- automation is evaluated using local time
- but dedupe decides whether it already ran using UTC

That can create bugs around:
- midnight boundaries
- timezone offsets
- DST-related edge windows

---

## Goal
Make schedule dedupe use the **same local server time basis** as schedule matching.

The rule should be simple:
- if matching logic uses local time, dedupe must also use local time

---

## Required Change
Update `isInCurrentSlot()` in:
- `app/src/lib/automation-engine.ts`

Do **not** use `toISOString()` for slot comparison.

Instead, compare using local time components from `Date`:
- year
- month
- date
- hour
- minute where appropriate

---

## Desired Behavior

### Daily schedules
If an automation is configured for `daily` at `22:30`:
- once it runs for the current **local calendar date**, it should not run again until the next **local calendar date**

### Hourly schedules
If an automation is configured for `hourly` at minute `15`:
- once it runs for the current **local hour slot**, it should not run again until the next **local hour**

---

## Recommended Implementation
Keep it explicit and readable.

### Example approach
Inside `isInCurrentSlot(lastRunAt, config)`:

1. Parse `lastRunAt` to `Date`
2. Create `now = new Date()`
3. For `daily`:
   - compare `getFullYear()`
   - compare `getMonth()`
   - compare `getDate()`
4. For `hourly`:
   - compare `getFullYear()`
   - compare `getMonth()`
   - compare `getDate()`
   - compare `getHours()`

That is enough because the schedule-matching logic already determines whether the current minute/time is the correct slot.

---

## Important Constraints
- Do not change trigger types
- Do not change action logic
- Do not change polling cadence
- Do not rewrite schedule evaluation entirely
- Do not introduce timezone libraries

Use built-in `Date` only.

---

## Acceptance Criteria
This patch is done when:
- schedule matching and dedupe both use **local server time**
- no UTC/local mismatch remains in slot comparison
- daily automations do not duplicate across local date boundaries
- hourly automations do not duplicate across local hour boundaries

---

## Suggested Manual Test

### Daily
1. Create a daily automation a few minutes ahead
2. Let it fire once
3. Confirm it does not fire again during the same local day

### Hourly
1. Create an hourly automation for the current or next minute slot
2. Let it fire once
3. Confirm it does not fire again during the same local hour

### Boundary sanity check
If practical, test near a local day/hour boundary to confirm no UTC-related weirdness.

---

## Deliverable
Produce:
1. the tiny code patch
2. a short summary of what changed
3. confirmation that local-time dedupe now matches local-time schedule evaluation

---

## Final Note
This is the last correctness patch before calling the automation system launchable alpha.

Keep it small.
Keep it precise.
