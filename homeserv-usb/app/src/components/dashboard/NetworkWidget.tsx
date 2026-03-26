"use client";

import { ArrowDown, ArrowUp, Network } from "lucide-react";
import type { SystemSnapshot } from "@/hooks/useSystemMetrics";

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1e6) return `${(bytesPerSec / 1e6).toFixed(1)} MB/s`;
  if (bytesPerSec >= 1e3) return `${(bytesPerSec / 1e3).toFixed(1)} KB/s`;
  return `${bytesPerSec.toFixed(0)} B/s`;
}

export function NetworkWidget({ metrics }: { metrics: SystemSnapshot | null }) {
  if (!metrics) {
    return (
      <div className="warm-card p-6 animate-pulse-warm">
        <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  const totalRx = metrics.network.reduce((s, n) => s + n.rxSec, 0);
  const totalTx = metrics.network.reduce((s, n) => s + n.txSec, 0);

  return (
    <div className="warm-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Network className="w-4 h-4 text-blue-500" />
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
          Network
        </h3>
      </div>

      <div className="flex gap-6">
        <div className="flex items-center gap-2">
          <ArrowDown className="w-4 h-4 text-emerald-500" />
          <div>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {formatSpeed(totalRx)}
            </p>
            <p className="text-xs text-slate-400">Download</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUp className="w-4 h-4 text-blue-500" />
          <div>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {formatSpeed(totalTx)}
            </p>
            <p className="text-xs text-slate-400">Upload</p>
          </div>
        </div>
      </div>
    </div>
  );
}
