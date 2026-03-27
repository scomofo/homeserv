# Network Scanner Feature — HomeServ

## Overview

Add network discovery and port scanning to HomeServ. A new `/network` page shows all devices found via ARP + mDNS scanning, their open ports, MAC vendor info, and online/offline history. Discovered devices can be promoted into the existing unified device system.

## New Files

### `src/lib/network-scanner.ts`
Core scanner library:
- **ARP discovery**: Parse `arp -a` output (Windows-compatible, no native deps)
- **Port scanning**: `net.Socket.connect()` with 1s timeout on ports: 22 (SSH), 80 (HTTP), 443 (HTTPS), 8080 (HTTP-Alt), 3000 (Dev), 5000 (Dev), 8443 (HTTPS-Alt), 445 (SMB), 139 (NetBIOS), 3389 (RDP), 5900 (VNC)
- **Name resolution**: `dns.reverse()` + `bonjour-service` for mDNS
- **MAC vendor lookup**: `macvendors.com` API, cached in DB to avoid repeat lookups
- **Scan orchestration**: `runNetworkScan()` — discovers devices, scans ports, resolves names, updates DB history

### `src/app/api/network/route.ts`
- **GET**: List all network devices from DB (with optional `?status=online` filter)
- **POST**: Trigger a new scan, return results
- **DELETE**: Remove a device by MAC address

### `src/app/api/network/[id]/promote/route.ts`
- **POST**: Promote a scanned device into the unified `devices` table as `source: "scan"`

### `src/app/network/page.tsx`
Full network inventory page:
- Scan button with spinner/progress
- Device table: status dot, name, IP, MAC, vendor, open ports (badges), last seen
- "Promote to Devices" action per row
- Auto-refresh every 30s
- Filter toggles: All / Online / Offline
- Matches existing HomeServ dark theme and card-based layout

### `src/hooks/useNetworkDevices.ts`
- Polls `/api/network` every 30s
- Exposes `devices`, `scanning`, `triggerScan()`, `removeDevice()`

### `src/components/dashboard/NetworkDevicesWidget.tsx`
Dashboard summary card:
- Total devices discovered
- Online / Offline counts with colored dots
- Link to `/network` page

## Modified Files

### `src/lib/schema.ts`
Add `networkDevices` table:
```
networkDevices {
  mac: text (PK)
  ip: text
  name: text
  vendor: text
  portsJson: text (JSON array of {port, label} objects)
  lastSeen: text (ISO datetime)
  firstSeen: text (ISO datetime)
  status: text ("online" | "offline")
}
```

### `src/components/layout/Sidebar.tsx`
Add "Network" nav item with `Radar` lucide icon, route `/network`, positioned after "System".

### `src/app/page.tsx`
Add `NetworkDevicesWidget` to dashboard grid.

## Dependencies

- `bonjour-service` — pure JS mDNS/Zeroconf discovery (replaces Python's `zeroconf`)

## Technical Notes

- Port scanning runs sequentially per device to avoid flooding the network
- MAC vendor results are cached in the DB `vendor` column; only looked up once per MAC
- ARP table is populated by the OS; no raw packet injection needed (unlike scapy)
- All scanning runs server-side in API route handlers
- The scan is async — POST returns immediately, results update via polling
- History persists across scans: devices not found are marked offline, not deleted

## Out of Scope

- Markdown report generation (the Python script's `generate_report`) — the UI table serves this purpose
- Raw packet ARP scanning (scapy equivalent) — `arp -a` is sufficient and requires no elevated privileges
- Continuous background scanning — manual trigger + auto-refresh for now
