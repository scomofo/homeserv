# HomeServ – Claude Handoff

## Overview
HomeServ is a self-hosted home server dashboard built with Next.js (App Router), SQLite (Drizzle ORM), and Node-based system integrations.

Core capabilities:
- System monitoring (SSE streaming)
- Device control (Home Assistant + MQTT)
- File manager + media server
- Wake-on-LAN
- Remote desktop (VNC – in progress)
- Automation engine (to be implemented)

---

## Current State (IMPORTANT)

This is NOT production complete.

Status:
- ~65% feature complete (prototype)
- ~40% production ready

Key gaps:
- Remote Desktop incomplete (needs noVNC)
- Automation engine not implemented (schema only)
- Security needs hardening
- MQTT UX incomplete

---

## Architecture

### Frontend
- Next.js App Router
- Client-heavy pages (`"use client"`)
- Fetch-based API calls

### Backend
- Next.js route handlers (`/api/*`)
- SQLite via Drizzle ORM
- In-memory services for MQTT + system monitoring

### Key Modules
- `lib/system-monitor.ts` – system stats + SSE
- `lib/device-manager.ts` – device abstraction layer
- `lib/ha-client.ts` – Home Assistant integration
- `lib/mqtt-client.ts` – MQTT connection + pub/sub
- `lib/wol.ts` – Wake-on-LAN
- `lib/file-service.ts` / `media-service.ts`

---

## Critical Constraints

### 1. Security must be fixed before launch
- No fallback JWT secret
- DB-backed session validation in middleware
- Secure cookies
- Encrypt sensitive settings

### 2. Remote Desktop must be real
- Replace placeholder with noVNC
- Implement full RFB client
- Secure WebSocket proxy

### 3. Automation must exist (core product requirement)
- API
- Execution engine
- UI

---

## Development Priorities

### P0 – Must Ship

#### Auth & Security
- Enforce JWT_SECRET
- Validate session against DB
- Secure cookies
- Encrypt stored credentials

#### Remote Desktop
- Integrate noVNC
- Implement full client
- Add WS auth + reconnect

#### Automation Engine
- CRUD API (`/api/automations`)
- Background worker
- Trigger types:
  - MQTT topic
  - HA state change
  - time (cron)
- Actions:
  - HA service
  - MQTT publish
  - WOL

---

### P1 – Should Ship

#### MQTT UX
- Device creation UI
- Topic mapping

#### Settings
- Validate inputs (JSON, URLs, ports)
- Wire session timeout to auth

#### Error Handling
- Replace silent catches
- Show user errors

#### Onboarding
- First-run flow
- Setup checklist

---

### P2 – Can Wait

- Role-based access
- Logging UI
- Mobile optimization
- Plugin system

---

## Automation Engine – Design (IMPORTANT)

Keep it SIMPLE (v1):

### Schema
- id
- name
- enabled
- trigger_type
- trigger_config (JSON)
- action_type
- action_config (JSON)

### Execution Model
- Single worker loop
- Event-driven where possible:
  - MQTT → subscribe
  - HA → poll or websocket
- Fallback polling (interval)

### Example
IF:
- MQTT topic `home/livingroom/light`
- value = "on"

THEN:
- call HA service `light.turn_off`

---

## Remote Desktop – Implementation Notes

### Required
- Use noVNC (RFB client)
- Serve from `/public/noVNC`
- Replace canvas placeholder

### Flow
Browser → WebSocket → VNC proxy → VNC server

### Must handle
- input events
- resizing
- reconnect
- auth

---

## Coding Guidelines

- Avoid silent `catch {}`
- Always return structured API errors
- Validate all user input
- Prefer simple implementations over abstraction
- Do NOT over-engineer automation v1

---

## Definition of Done (Launch)

A feature is done when:
- Works end-to-end via UI
- Has error handling
- Has basic validation
- Is not misleading in UI/README

---

## Immediate Next Steps

1. Security hardening
2. Remote Desktop (noVNC)
3. Automation engine (API + worker + UI)
4. MQTT UX
5. Launch cleanup

---

## Positioning (IMPORTANT)

Until automation is complete:

"HomeServ – self-hosted home server dashboard (alpha)"

After automation:

"HomeServ – self-hosted home automation + server control platform"

---

## Final Note

Do not chase polish first.

Priority order:
1. Security
2. Real functionality (automation + remote desktop)
3. UX

Ship something real, then refine.
