import si from "systeminformation";
import { db } from "./db";
import { systemMetrics } from "./schema";

export interface SystemSnapshot {
  cpu: { load: number; cores: number[] };
  memory: { total: number; used: number; free: number; percent: number };
  disks: { fs: string; size: number; used: number; mount: string; percent: number }[];
  network: { iface: string; rxSec: number; txSec: number }[];
  temps: { main: number; cores: { temp: number }[] } | null;
  os: { platform: string; distro: string; hostname: string };
  uptime: number;
}

export async function getSystemSnapshot(): Promise<SystemSnapshot> {
  const [cpu, mem, disk, net, temp, osInfo, time] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.cpuTemperature().catch(() => null),
    si.osInfo(),
    si.time(),
  ]);

  return {
    cpu: {
      load: cpu.currentLoad,
      cores: cpu.cpus.map((c) => c.load),
    },
    memory: {
      total: mem.total,
      used: mem.used,
      free: mem.free,
      percent: (mem.used / mem.total) * 100,
    },
    disks: disk.map((d) => ({
      fs: d.fs,
      size: d.size,
      used: d.used,
      mount: d.mount,
      percent: d.use,
    })),
    network: net.map((n) => ({
      iface: n.iface,
      rxSec: n.rx_sec,
      txSec: n.tx_sec,
    })),
    temps: temp
      ? { main: temp.main, cores: temp.cores.map((c) => ({ temp: c })) }
      : null,
    os: {
      platform: osInfo.platform,
      distro: osInfo.distro,
      hostname: osInfo.hostname,
    },
    uptime: time.uptime,
  };
}

// Background metric collection
let collectorStarted = false;
let insertCount = 0;

export function startMetricCollector() {
  if (collectorStarted) return;
  collectorStarted = true;

  setInterval(async () => {
    try {
      const snapshot = await getSystemSnapshot();
      const id = crypto.randomUUID();

      db.insert(systemMetrics)
        .values({
          id,
          cpu: snapshot.cpu.load,
          memory: snapshot.memory.percent,
          diskJson: JSON.stringify(snapshot.disks),
          networkJson: JSON.stringify(snapshot.network),
          tempsJson: snapshot.temps ? JSON.stringify(snapshot.temps) : null,
        })
        .run();

      insertCount++;

      // Cleanup old records every 100 inserts
      if (insertCount % 100 === 0) {
        cleanupOldMetrics();
      }
    } catch {
      // Silently continue on collection failure
    }
  }, 60_000);
}

function cleanupOldMetrics() {
  try {
    // Keep 24 hours of per-minute data
    const sqlite = (db as unknown as { $client: { exec: (sql: string) => void } }).$client;
    if (sqlite && typeof sqlite.exec === "function") {
      sqlite.exec(
        `DELETE FROM system_metrics WHERE timestamp < datetime('now', '-24 hours')`
      );
    }
  } catch {
    // Ignore cleanup errors
  }
}

export function getMetricHistory(hours: number) {
  const sqlite = (db as unknown as { $client: { prepare: (sql: string) => { all: (...args: unknown[]) => unknown[] } } }).$client;
  if (!sqlite || typeof sqlite.prepare !== "function") return [];

  const stmt = sqlite.prepare(
    `SELECT * FROM system_metrics WHERE timestamp >= datetime('now', ?) ORDER BY timestamp ASC`
  );
  return stmt.all(`-${hours} hours`);
}
