import { execSync } from "child_process";
import net from "net";
import dns from "dns";
import { db } from "./db";
import { networkDevices } from "./schema";
import { eq } from "drizzle-orm";

export interface NetworkDevice {
  mac: string;
  ip: string;
  name: string;
  vendor: string;
  ports: { port: number; label: string }[];
  lastSeen: string;
  firstSeen: string;
  status: "online" | "offline";
}

const SCAN_PORTS: Record<number, string> = {
  22: "SSH",
  80: "HTTP",
  443: "HTTPS",
  445: "SMB",
  139: "NetBIOS",
  3000: "Dev",
  3389: "RDP",
  5000: "Dev",
  5900: "VNC",
  8080: "HTTP-Alt",
  8443: "HTTPS-Alt",
};

// MAC vendor cache to avoid repeated API calls within a scan
const vendorCache = new Map<string, string>();

/**
 * Parse the output of `arp -a` to discover devices on the local network.
 * Works on Windows (Git Bash / cmd).
 */
function discoverDevicesViaArp(): { ip: string; mac: string }[] {
  try {
    const output = execSync("arp -a", { encoding: "utf-8", timeout: 10000 });
    const devices: { ip: string; mac: string }[] = [];
    const lines = output.split("\n");

    for (const line of lines) {
      // Windows format: "  192.168.1.1          aa-bb-cc-dd-ee-ff     dynamic"
      const winMatch = line.match(
        /\s+([\d.]+)\s+([0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2})\s+/
      );
      if (winMatch) {
        const ip = winMatch[1];
        const mac = winMatch[2].replace(/-/g, ":").toUpperCase();
        // Skip broadcast and incomplete entries
        if (mac !== "FF:FF:FF:FF:FF:FF" && !ip.endsWith(".255")) {
          devices.push({ ip, mac });
        }
      }
    }

    return devices;
  } catch {
    return [];
  }
}

/**
 * Scan a single port on a host. Returns true if open.
 */
function scanPort(ip: string, port: number, timeout = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, ip);
  });
}

/**
 * Scan all known ports on a host.
 */
async function scanAllPorts(ip: string): Promise<{ port: number; label: string }[]> {
  const results: { port: number; label: string }[] = [];

  // Scan ports in parallel batches of 4 to avoid flooding
  const portEntries = Object.entries(SCAN_PORTS).map(([p, label]) => ({
    port: parseInt(p),
    label,
  }));

  for (let i = 0; i < portEntries.length; i += 4) {
    const batch = portEntries.slice(i, i + 4);
    const batchResults = await Promise.all(
      batch.map(async ({ port, label }) => {
        const open = await scanPort(ip, port);
        return open ? { port, label } : null;
      })
    );
    for (const r of batchResults) {
      if (r) results.push(r);
    }
  }

  return results;
}

/**
 * Attempt reverse DNS lookup for a hostname.
 */
function reverseLookup(ip: string): Promise<string | null> {
  return new Promise((resolve) => {
    dns.reverse(ip, (err, hostnames) => {
      if (err || !hostnames || hostnames.length === 0) {
        resolve(null);
      } else {
        resolve(hostnames[0].split(".")[0]);
      }
    });
  });
}

/**
 * Look up MAC vendor via macvendors.com API. Caches results.
 */
async function lookupMacVendor(mac: string): Promise<string> {
  if (vendorCache.has(mac)) return vendorCache.get(mac)!;

  try {
    const res = await fetch(`https://api.macvendors.com/${encodeURIComponent(mac)}`, {
      signal: AbortSignal.timeout(2000),
    });
    const vendor = res.ok ? await res.text() : "Unknown";
    vendorCache.set(mac, vendor);
    return vendor;
  } catch {
    vendorCache.set(mac, "Lookup Failed");
    return "Lookup Failed";
  }
}

/**
 * Run a full network scan: ARP discovery, port scan, name resolution, vendor lookup.
 * Updates the database with results.
 */
export async function runNetworkScan(): Promise<NetworkDevice[]> {
  const now = new Date().toISOString();

  // Mark all existing devices as offline
  const existing = db.select().from(networkDevices).all();
  for (const device of existing) {
    db.update(networkDevices)
      .set({ status: "offline" })
      .where(eq(networkDevices.mac, device.mac))
      .run();
  }

  // Discover devices via ARP
  const arpDevices = discoverDevicesViaArp();

  // Process each discovered device
  for (const { ip, mac } of arpDevices) {
    // Check if device already exists in DB
    const existingDevice = db
      .select()
      .from(networkDevices)
      .where(eq(networkDevices.mac, mac))
      .get();

    // Port scan
    const ports = await scanAllPorts(ip);

    // Name resolution - try reverse DNS, fall back to existing name
    let name = existingDevice?.name || "---";
    const dnsName = await reverseLookup(ip);
    if (dnsName) name = dnsName;

    // Vendor lookup - use cached/existing if available
    let vendor = existingDevice?.vendor;
    if (!vendor || vendor === "Unknown" || vendor === "Lookup Failed") {
      vendor = await lookupMacVendor(mac);
      // Rate limit: small delay between vendor lookups
      await new Promise((r) => setTimeout(r, 300));
    }

    // Upsert device
    const deviceData = {
      mac,
      ip,
      name,
      vendor: vendor || "Unknown",
      portsJson: JSON.stringify(ports),
      lastSeen: now,
      firstSeen: existingDevice?.firstSeen || now,
      status: "online" as const,
    };

    if (existingDevice) {
      db.update(networkDevices)
        .set(deviceData)
        .where(eq(networkDevices.mac, mac))
        .run();
    } else {
      db.insert(networkDevices).values(deviceData).run();
    }
  }

  return getAllNetworkDevices();
}

/**
 * Get all network devices from the database.
 */
export function getAllNetworkDevices(statusFilter?: "online" | "offline"): NetworkDevice[] {
  let query = db.select().from(networkDevices);

  const rows = statusFilter
    ? query.where(eq(networkDevices.status, statusFilter)).all()
    : query.all();

  return rows.map((row) => ({
    mac: row.mac,
    ip: row.ip,
    name: row.name,
    vendor: row.vendor,
    ports: JSON.parse(row.portsJson) as { port: number; label: string }[],
    lastSeen: row.lastSeen,
    firstSeen: row.firstSeen,
    status: row.status as "online" | "offline",
  }));
}

/**
 * Delete a network device from the database.
 */
export function deleteNetworkDevice(mac: string): void {
  db.delete(networkDevices).where(eq(networkDevices.mac, mac)).run();
}

/**
 * Update a network device's name (user-assigned).
 */
export function updateNetworkDeviceName(mac: string, name: string): void {
  db.update(networkDevices)
    .set({ name })
    .where(eq(networkDevices.mac, mac))
    .run();
}

/**
 * Promote a network device into the unified devices table.
 */
export function promoteNetworkDevice(mac: string, room?: string): string {
  const device = db
    .select()
    .from(networkDevices)
    .where(eq(networkDevices.mac, mac))
    .get();

  if (!device) throw new Error("Network device not found");

  const { devices } = require("./schema");
  const id = `scan-${mac.replace(/:/g, "")}`;

  db.insert(devices)
    .values({
      id,
      name: device.name === "---" ? `Device ${device.ip}` : device.name,
      type: "other",
      room: room || null,
      source: "scan",
      configJson: JSON.stringify({ mac: device.mac, vendor: device.vendor }),
      stateJson: JSON.stringify({ ip: device.ip, ports: JSON.parse(device.portsJson) }),
      lastSeen: device.lastSeen,
    })
    .run();

  return id;
}
