"use client";

import { Clock } from "lucide-react";
import type { SystemSnapshot } from "@/hooks/useSystemMetrics";

function formatUptime(seconds: number): { days: number; hours: number; minutes: number } {
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
  };
}

export function UptimeWidget({ metrics }: { metrics: SystemSnapshot | null }) {
  if (!metrics) {
    return (
      <div className="warm-card p-6 animate-pulse-warm">
        <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  const { days, hours, minutes } = formatUptime(metrics.uptime);

  return (
    <div className="warm-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
          Uptime
        </h3>
      </div>

      <div className="flex items-baseline gap-1">
        {days > 0 && (
          <>
            <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{days}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400 mr-2">days</span>
          </>
        )}
        <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{hours}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400 mr-2">hrs</span>
        <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{minutes}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400">min</span>
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
        {metrics.os.hostname} &middot; {metrics.os.distro}
      </p>
    </div>
  );
}
