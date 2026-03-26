"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb, Wifi, WifiOff, ChevronRight } from "lucide-react";

interface DeviceSummary {
  total: number;
  online: number;
  on: number;
}

export function DeviceStatusWidget() {
  const [summary, setSummary] = useState<DeviceSummary | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/devices");
        if (!res.ok) return;
        const devices = await res.json();

        if (!Array.isArray(devices)) return;

        const total = devices.length;
        const online = devices.filter((d: { available: boolean }) => d.available).length;
        const on = devices.filter((d: { state: { state?: string } }) => {
          const s = String(d.state?.state || "").toLowerCase();
          return s === "on" || s === "playing" || s === "unlocked" || s === "open";
        }).length;

        setSummary({ total, online, on });
      } catch {
        // Ignore
      }
    }

    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="warm-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            Devices
          </h3>
        </div>
        <Link
          href="/devices"
          className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-0.5"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {summary === null ? (
        <div className="flex gap-6">
          <div className="h-12 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse-warm" />
          <div className="h-12 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse-warm" />
          <div className="h-12 w-16 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse-warm" />
        </div>
      ) : summary.total === 0 ? (
        <p className="text-sm text-slate-400">No devices configured</p>
      ) : (
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{summary.online}</p>
              <p className="text-xs text-slate-400">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{summary.on}</p>
              <p className="text-xs text-slate-400">Active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {summary.total - summary.online}
              </p>
              <p className="text-xs text-slate-400">Offline</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
