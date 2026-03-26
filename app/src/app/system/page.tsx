"use client";

import { useRef } from "react";
import { useSystemMetrics } from "@/hooks/useSystemMetrics";
import { CpuChart } from "@/components/system/CpuChart";
import { MemoryChart } from "@/components/system/MemoryChart";
import { DiskChart } from "@/components/system/DiskChart";
import { NetworkChart } from "@/components/system/NetworkChart";
import { Skeleton } from "@/components/ui/Skeleton";
import { Activity, Wifi, WifiOff } from "lucide-react";

const MAX_HISTORY = 60;

export default function SystemPage() {
  const { metrics, connected } = useSystemMetrics();
  const cpuHistory = useRef<{ time: string; value: number }[]>([]);
  const memHistory = useRef<{ time: string; value: number }[]>([]);
  const netHistory = useRef<{ time: string; rx: number; tx: number }[]>([]);

  if (metrics) {
    const time = new Date().toLocaleTimeString();

    cpuHistory.current = [
      ...cpuHistory.current.slice(-(MAX_HISTORY - 1)),
      { time, value: metrics.cpu.load },
    ];

    memHistory.current = [
      ...memHistory.current.slice(-(MAX_HISTORY - 1)),
      { time, value: metrics.memory.percent },
    ];

    const totalRx = metrics.network.reduce((s, n) => s + n.rxSec, 0);
    const totalTx = metrics.network.reduce((s, n) => s + n.txSec, 0);
    netHistory.current = [
      ...netHistory.current.slice(-(MAX_HISTORY - 1)),
      { time, rx: totalRx, tx: totalTx },
    ];
  }

  function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    parts.push(`${m}m`);
    return parts.join(" ");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            System Monitor
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="w-4 h-4 text-emerald-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {connected ? "Live" : "Disconnected"}
          </span>
          {metrics && (
            <span className="text-sm text-slate-400 dark:text-slate-500 ml-4">
              Uptime: {formatUptime(metrics.uptime)}
            </span>
          )}
        </div>
      </div>

      {!metrics ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      ) : (
        <>
          {/* OS info bar */}
          <div className="warm-card p-4 mb-6 flex items-center gap-6 text-sm text-slate-600 dark:text-slate-300">
            <span>
              <strong>Host:</strong> {metrics.os.hostname}
            </span>
            <span>
              <strong>OS:</strong> {metrics.os.distro}
            </span>
            {metrics.temps && metrics.temps.main > 0 && (
              <span>
                <strong>CPU Temp:</strong>{" "}
                <span
                  className={
                    metrics.temps.main > 80
                      ? "text-red-500"
                      : metrics.temps.main > 60
                      ? "text-amber-500"
                      : "text-emerald-500"
                  }
                >
                  {metrics.temps.main.toFixed(0)}C
                </span>
              </span>
            )}
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 stagger-children">
            <CpuChart
              history={cpuHistory.current}
              currentLoad={metrics.cpu.load}
              cores={metrics.cpu.cores}
            />
            <MemoryChart
              history={memHistory.current}
              total={metrics.memory.total}
              used={metrics.memory.used}
              percent={metrics.memory.percent}
            />
            <DiskChart disks={metrics.disks} />
            <NetworkChart
              history={netHistory.current}
              currentRx={metrics.network.reduce((s, n) => s + n.rxSec, 0)}
              currentTx={metrics.network.reduce((s, n) => s + n.txSec, 0)}
            />
          </div>
        </>
      )}
    </div>
  );
}
