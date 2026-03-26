<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/SQLite-Drizzle-003b57?style=flat-square&logo=sqlite" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ed?style=flat-square&logo=docker" />
  <img src="https://img.shields.io/badge/Platform-Self_Hosted-22c55e?style=flat-square" />
</p>

# HomeServ

> Self-hosted home server dashboard for device management, system monitoring, media, and automation

---

### Highlights

| Feature | Description |
|:--------|:------------|
| **System Monitor** | Real-time CPU, memory, disk, and network charts via SSE |
| **Device Manager** | Track and control devices across rooms with status indicators |
| **Wake-on-LAN** | Wake devices remotely from the dashboard |
| **File Browser** | Browse and manage files on your server |
| **Media Server** | Stream media from your home server |
| **Home Assistant** | Integration with Home Assistant for smart home control |
| **MQTT** | MQTT client for IoT device communication |
| **Automations** | Rule-based automation engine |
| **Remote Desktop** | VNC proxy for remote desktop access |
| **Auth** | PIN/password authentication with session management |

---

### Tech Stack

```
Framework       Next.js 15 (App Router, TypeScript)
Database        SQLite via better-sqlite3 + Drizzle ORM
Realtime        Server-Sent Events (SSE) for live metrics
Integrations    Home Assistant  |  MQTT  |  Wake-on-LAN  |  VNC
Deployment      Docker  |  Portable USB  |  Direct install
Styling         Tailwind CSS
```

### Quick Start

```bash
cd app
npm install
npm run dev                    # Dev server on :3001
```

### Docker Deployment

```bash
docker-compose up -d           # Production deployment
```

### Portable USB Install

```bash
./build-usb.sh                 # Build USB-bootable version
# or on Windows:
build-usb.bat
```

### Dashboard Pages

| Page | Route | Description |
|:-----|:------|:------------|
| Dashboard | `/` | System overview with widgets |
| Devices | `/devices` | Device management by room |
| System | `/system` | CPU, memory, disk, network charts |
| Files | `/files` | File browser |
| Media | `/media` | Media library and streaming |
| Wake | `/wake` | Wake-on-LAN interface |
| Desktop | `/desktop` | Remote desktop via VNC |
| Settings | `/settings` | Server configuration |
| Setup | `/setup` | First-run configuration wizard |

### Architecture

```
homeserv/
  app/
    src/
      app/
        api/                   # REST API routes (auth, devices, system, files, etc.)
        (pages)/               # Next.js pages (dashboard, devices, system, media)
      components/
        dashboard/             # Dashboard widgets
        devices/               # Device cards and room views
        system/                # CPU, memory, disk, network charts
        layout/                # AppShell, Sidebar
      lib/
        auth.ts                # Authentication
        db.ts                  # Database connection
        device-manager.ts      # Device tracking
        system-monitor.ts      # System metrics collection
        ha-client.ts           # Home Assistant integration
        mqtt-client.ts         # MQTT client
        wol.ts                 # Wake-on-LAN
  docker-compose.yml           # Production deployment
  portable/                    # USB portable install scripts
```

---

*Built by Scott Morley*
