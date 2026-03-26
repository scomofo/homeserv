<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/SQLite-Drizzle-003b57?style=for-the-badge&logo=sqlite&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Ready-2496ed?style=for-the-badge&logo=docker&logoColor=white" />
</p>

<h1 align="center">🏠 HomeServ</h1>

<p align="center">
  <strong>Self-hosted home server dashboard &mdash; monitor, manage, automate</strong>
</p>

<p align="center">
  <em>Docker &bull; Portable USB &bull; Direct Install</em>
</p>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 📊 Monitor
- **System Metrics** &mdash; Real-time CPU, RAM, disk, network
- **Live Charts** &mdash; SSE-powered streaming graphs
- **Device Status** &mdash; Track all network devices

</td>
<td width="50%">

### 🔧 Manage
- **File Browser** &mdash; Browse and manage server files
- **Wake-on-LAN** &mdash; Wake devices remotely
- **Remote Desktop** &mdash; VNC proxy built in

</td>
</tr>
<tr>
<td>

### 🏡 Automate
- **Home Assistant** &mdash; Smart home integration
- **MQTT** &mdash; IoT device communication
- **Rule Engine** &mdash; Custom automation triggers

</td>
<td>

### 🎬 Media
- **Media Server** &mdash; Stream from your library
- **Auth System** &mdash; PIN/password with sessions
- **Multi-deploy** &mdash; Docker, USB, or direct

</td>
</tr>
</table>

---

## 🖥️ Dashboard Pages

| Icon | Page | Route | Description |
|:-----|:-----|:------|:------------|
| 📊 | Dashboard | `/` | System overview widgets |
| 📟 | Devices | `/devices` | Manage by room |
| 💻 | System | `/system` | CPU, memory, disk, network |
| 📁 | Files | `/files` | File browser |
| 🎬 | Media | `/media` | Media library |
| ⏰ | Wake | `/wake` | Wake-on-LAN |
| 🖥️ | Desktop | `/desktop` | Remote VNC |
| ⚙️ | Settings | `/settings` | Configuration |
| 🔧 | Setup | `/setup` | First-run wizard |

---

## 🚀 Quick Start

```bash
cd app
npm install
npm run dev        # Dev server on :3001
```

## 🐳 Docker

```bash
docker-compose up -d
```

## 💾 Portable USB

```bash
./build-usb.sh     # Linux/Mac
build-usb.bat       # Windows
```

## 📁 Structure

```
homeserv/
├── app/
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/              REST endpoints
│   │   │   ├── (pages)/          Dashboard, devices, system...
│   │   │   └── layout.tsx        App layout
│   │   ├── components/
│   │   │   ├── dashboard/        Stat widgets
│   │   │   ├── devices/          Device cards
│   │   │   ├── system/           Metric charts
│   │   │   └── layout/           AppShell, Sidebar
│   │   └── lib/
│   │       ├── db.ts             SQLite + Drizzle
│   │       ├── system-monitor.ts Metrics collection
│   │       ├── ha-client.ts      Home Assistant
│   │       ├── mqtt-client.ts    MQTT
│   │       └── wol.ts            Wake-on-LAN
│   └── Dockerfile
├── docker-compose.yml
├── portable/                     USB install scripts
└── homeserv-usb/                 Pre-built USB image
```

---

<p align="center">
  <sub>Built by Scott Morley</sub>
</p>
