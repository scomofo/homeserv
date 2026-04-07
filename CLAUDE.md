# HomeServ

Self-hosted home server dashboard with device control, system monitoring, and automation.

## Quick Reference

- **App root:** `app/` — all npm/npx commands run from here
- **Dev:** `npm run dev` (http://localhost:3001)
- **Build:** `npm run build && npm run start` (production on :3001)
- **Lint:** `npm run lint` (ESLint 9)
- **DB migrations:** `npx drizzle-kit generate && npx drizzle-kit push`
- **Docker:** `docker compose up -d` from repo root (ports 3001 + 3002)
- **No test runner configured**

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript 5
- Tailwind CSS 4, Recharts, Lucide React
- SQLite (better-sqlite3 + Drizzle ORM), Zod 4
- MQTT.js 5, jose (JWT), bcrypt, systeminformation
- WebSocket (ws) for VNC proxy
- Docker: Node 20 (bookworm-slim)

**Next.js version warning:** Next.js 16 has breaking changes from training data. Check `node_modules/next/dist/docs/` before writing Next.js code.

## Architecture

### Directory Structure

```
app/                          ← npm project root
  src/
    app/                      ← Next.js App Router pages
      api/                    ← Route handlers
        auth/ automations/ devices/ files/ ha/
        media/ mqtt/ network/ settings/ system/ wol/
      desktop/ devices/ files/ login/ media/
      network/ settings/ setup/ system/ wake/
    components/
      dashboard/              ← Dashboard widgets (SystemOverview, Network, Devices, etc.)
      devices/                ← DeviceCard, RoomView
      layout/                 ← AppShell, Sidebar
      system/                 ← CpuChart, MemoryChart, DiskChart, NetworkChart
      ui/                     ← Skeleton
    hooks/                    ← useDevices, useNetworkDevices, useSystemMetrics
    lib/                      ← Core modules (see below)
    middleware.ts             ← Auth middleware (JWT session validation)
  data/                       ← Persistent data dir (homeserv.db)
  public/                     ← Static assets
  drizzle.config.ts
homeserv-usb/                 ← USB portable deployment (Docker image + install scripts)
docker-compose.yml            ← Production Docker config
```

### Key Modules (`app/src/lib/`)

| File | Purpose |
|------|---------|
| `schema.ts` | Drizzle schema: users, sessions, devices, wol_devices, automations, system_metrics, settings, network_devices |
| `db.ts` | Database connection + initialization |
| `auth.ts` | JWT auth (jose), session management |
| `system-monitor.ts` | System stats via systeminformation + SSE streaming |
| `device-manager.ts` | Device abstraction layer |
| `ha-client.ts` | Home Assistant REST API integration |
| `mqtt-client.ts` | MQTT connection + pub/sub |
| `network-scanner.ts` | ARP discovery + port scanning |
| `wol.ts` | Wake-on-LAN magic packets |
| `file-service.ts` | File browser operations |
| `media-service.ts` | Media file serving + thumbnails |
| `vnc-proxy.ts` | WebSocket VNC proxy (incomplete) |
| `automation-engine.ts` | Automation worker (schema exists, engine incomplete) |
| `settings.ts` | Key-value settings store |
| `utils.ts` | Shared utilities |

### Database

SQLite at `app/data/homeserv.db`. Tables: users, sessions, devices, wol_devices, automations, system_metrics, settings, network_devices.

### Deployment

- **Dev:** `npm run dev` from `app/`
- **Docker:** `docker compose up -d` — maps port 3001 (web) and 3002 (VNC WebSocket)
- **USB portable:** `homeserv-usb/` contains Docker image tar + install/uninstall scripts for offline deployment

## Platform Notes

- Primary development platform is **Windows 11**
- Shell environment is bash (Git Bash), use Unix path syntax
- Docker containers run Node 20 on Debian bookworm-slim
- `NET_RAW` capability required in Docker for WOL and ping

## Current State

**~65% feature complete (prototype), ~40% production ready**

### Working
- Dashboard with system monitoring (SSE streaming)
- Device management (Home Assistant + MQTT)
- File manager + media server
- Wake-on-LAN
- Network scanner (ARP discovery + port scanning)
- Auth (JWT + sessions)
- Settings management
- Docker deployment + USB portable

### Incomplete
- Remote Desktop — placeholder only, needs noVNC integration
- Automation engine — schema exists, execution engine not implemented
- MQTT UX — device creation UI + topic mapping missing
- Security hardening — JWT secret enforcement, cookie security, credential encryption

## Development Priorities

### P0 — Must Ship
1. **Security hardening:** Enforce JWT_SECRET, validate sessions in middleware, secure cookies, encrypt stored credentials
2. **Remote Desktop:** Integrate noVNC, WebSocket proxy auth, reconnect handling
3. **Automation engine:** CRUD API, background worker, triggers (MQTT topic, HA state change, cron), actions (HA service call, MQTT publish, WOL)

### P1 — Should Ship
- MQTT device creation UI + topic mapping
- Settings input validation (JSON, URLs, ports)
- Replace silent catches with user-facing errors
- First-run onboarding flow

### P2 — Can Wait
- Role-based access control
- Logging UI
- Mobile optimization
- Plugin system

## Coding Guidelines

- Avoid silent `catch {}` — always return structured API errors
- Validate all user input (Zod schemas preferred)
- Prefer simple implementations over abstraction
- Client-heavy pages use `"use client"` directive
- Do NOT over-engineer automation v1
