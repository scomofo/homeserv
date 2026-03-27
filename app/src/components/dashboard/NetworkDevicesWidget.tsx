"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Radar, Wifi, WifiOff, ChevronRight, Shield } from "lucide-react";

interface Summary {
  total: number;
  online: number;
  offline: number;
  openPorts: number;
}

export function NetworkDevicesWidget() {
  const [summary, setSummary] = useState<Summary | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/network");
      if (!res.ok) return;
      const data = await res.json();
      const devices: { status: string; ports: unknown[] }[] = data.devices || [];
      setSummary({
        total: devices.length,
        online: devices.filter((d) => d.status === "online").length,
        offline: devices.filter((d) => d.status === "offline").length,
        openPorts: devices.reduce((sum, d) => sum + (d.ports?.length || 0), 0),
      });
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 30_000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  return (
    <div className="warm-card p-6 relative overflow-hidden group">
      {/* Subtle grid background */}
      <div className="absolute inset-0 net-grid-bg opacity-50 pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-sm shadow-violet-500/20">
              <Radar className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Network
            </h3>
          </div>
          <Link
            href="/network"
            className="text-xs text-violet-500 hover:text-violet-600 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Scan <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {summary === null ? (
          <div className="flex gap-6">
            <div className="h-12 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse-warm" />
            <div className="h-12 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse-warm" />
          </div>
        ) : summary.total === 0 ? (
          <p className="text-sm text-slate-400">No scans yet</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                {summary.total}
              </span>
              <span className="text-sm text-slate-400">devices</span>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-500">{summary.online}</span>
                <span className="text-[11px] text-slate-400">on</span>
              </div>
              <div className="flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-sm font-semibold text-slate-400">{summary.offline}</span>
                <span className="text-[11px] text-slate-400">off</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-500" />
                <span className="text-sm font-semibold text-cyan-500">{summary.openPorts}</span>
                <span className="text-[11px] text-slate-400">ports</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
