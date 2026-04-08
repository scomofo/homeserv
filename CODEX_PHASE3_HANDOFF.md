# HomeServ – Codex Handoff: Phase 3 (Differentiation)

## Goal
Make HomeServ feel meaningfully different from a generic dashboard.

Phase 3 is about the features that make users say:
- "oh, this is actually useful"
- "this is easier than stitching tools together"

This phase focuses on:
1. Remote desktop completion
2. Automation UX upgrade
3. First-run onboarding
4. Device UX improvements

Do this in order.
Do not start with polish.
Start with real differentiators.

---

## Scope (Do in Order)

1. Remote desktop completion
2. Automation templates + creation UX
3. First-run onboarding flow
4. Device capability normalization + UX

---

# 1. Remote Desktop Completion

## Goal
Turn the current remote desktop page from a placeholder into a real, usable feature.

## Current state
The app already has a remote desktop page and VNC-oriented scaffolding, but it is not complete.
This phase should make it functional enough for alpha/beta differentiation.

## Requirements

### A. Integrate noVNC
- Add noVNC client assets in a way compatible with the current app
- Replace placeholder canvas behavior with a real VNC session
- Use a proper RFB client implementation

### B. Keep architecture simple
Browser -> WebSocket -> VNC proxy -> VNC server

### C. Required functionality
- connect
- disconnect
- keyboard input
- mouse input
- basic resize / viewport behavior
- visible connection state
- meaningful error messages

### D. Security
- require the existing HomeServ auth session before allowing VNC access
- do not expose a raw unauthenticated VNC bridge

### E. UX constraints
- do not overbuild settings or advanced VNC options yet
- just make the happy path work reliably

## Deliverables
- functional `/desktop` experience
- no more placeholder text pretending the feature is done
- basic error handling for missing VNC proxy / bad connection / auth failure

## Acceptance criteria
- user can connect to configured VNC server from browser
- remote desktop responds to input
- disconnect works cleanly
- app shows clear errors instead of dead UI

---

# 2. Automation UX Upgrade

## Goal
Make automation creation feel much faster and more approachable without changing the underlying engine much.

This is a UX layer, not an automation engine rewrite.

## Requirements

### A. Add templates
Create a small set of built-in automation templates.

Suggested starter templates:
- Turn off lights at night
- Wake PC on schedule
- When MQTT topic changes, send HA action
- When HA entity turns on, publish MQTT message

### B. Template behavior
Templates should:
- pre-fill the existing automation form
- still allow edits before save
- not require a separate new engine path

### C. Improve creation flow
- make "New Automation" feel easier than a blank form
- offer either:
  - template picker first, then edit form
  - or "Start from template" and "Start blank"

### D. Keep current architecture
Do not replace existing automation types, repo, or validation system.
Templates are just prefilled values + helper UX.

### E. Better summaries and affordances
- improve trigger/action summary readability where useful
- keep them short and understandable

## Deliverables
- template picker or equivalent simple entry point
- at least 3-4 useful templates
- improved create flow

## Acceptance criteria
- creating a common automation takes much fewer clicks
- users can still create blank custom automations
- templates save through existing automation APIs

---

# 3. First-Run Onboarding Flow

## Goal
Help new users get from install to useful state quickly.

Right now the app has setup/login/settings, but not a guided first-use flow.
This phase should close that gap.

## Requirements

### A. Build a simple onboarding flow
After initial setup/login, guide the user through:
1. server name / general settings
2. Home Assistant connection (optional)
3. MQTT connection (optional)
4. file/media paths (optional)
5. completion screen with next actions

### B. Keep it lightweight
- no giant wizard framework
- no complex persistence requirements beyond current settings model
- step-by-step UI is enough

### C. Add a dashboard checklist
If onboarding is incomplete, show a checklist widget such as:
- connect Home Assistant
- connect MQTT
- configure file paths
- create first automation

### D. Respect optionality
This is important:
- HA is optional
- MQTT is optional
- media/files are optional

Do not force users into a smart-home-only path.

## Deliverables
- onboarding route(s) or modal flow
- dashboard checklist for incomplete setup
- completion state stored in settings

## Acceptance criteria
- a fresh user can understand what to do next
- app feels guided rather than empty
- onboarding does not block advanced users unnecessarily

---

# 4. Device Capability Normalization + UX

## Goal
Make the Devices experience feel more coherent and less like mixed raw data from different sources.

## Requirements

### A. Normalize capabilities
For devices, define clear capability flags at app layer, such as:
- canToggle
- canDim
- canSetTemperature
- canLock
- canWake

These can be derived from source/type/state.

### B. Improve device rendering
Use capabilities to determine which controls to show.
Avoid generic or confusing controls on unsupported device types.

### C. Keep source integrations intact
Do not rewrite HA/MQTT ingestion.
This is an app-layer normalization pass.

### D. Improve grouping and clarity
- maintain room/type groupings
- make state/status easier to scan
- prefer practical readability over detailed technical metadata

## Deliverables
- normalized device capability model
- device cards that render more intelligently
- cleaner device interactions

## Acceptance criteria
- unsupported controls are not shown
- device cards feel more predictable across source types
- users can more easily understand what each device can do

---

## Constraints

Do NOT:
- redesign the automation engine
- add multi-step automations yet
- add plugin architecture yet
- chase perfect VNC compatibility with every edge case
- rebuild the entire devices system

Do:
- finish core differentiators
- make common flows feel easy
- keep changes compatible with current architecture

---

## Suggested Implementation Order

1. Complete remote desktop
2. Add automation templates and improved create flow
3. Add onboarding + dashboard checklist
4. Add device capability normalization and UI improvements

---

## Definition of Done

Phase 3 is complete when:
- remote desktop is genuinely usable
- automation creation is noticeably easier via templates
- a new user is guided through setup
- devices feel more coherent and understandable

At that point, HomeServ is not just functional — it is meaningfully differentiated.
