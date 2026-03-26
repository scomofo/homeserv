"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface NetworkChartProps {
  history: { time: string; rx: number; tx: number }[];
  currentRx: number;
  currentTx: number;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1e6) return `${(bytesPerSec / 1e6).toFixed(1)} MB/s`;
  if (bytesPerSec >= 1e3) return `${(bytesPerSec / 1e3).toFixed(1)} KB/s`;
  return `${bytesPerSec.toFixed(0)} B/s`;
}

export function NetworkChart({ history, currentRx, currentTx }: NetworkChartProps) {
  return (
    <div className="warm-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
          Network
        </h3>
        <div className="flex gap-4 text-sm">
          <span className="text-emerald-500">{formatSpeed(currentRx)}</span>
          <span className="text-blue-500">{formatSpeed(currentTx)}</span>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "rgba(30, 41, 59, 0.9)",
                border: "1px solid #334155",
                borderRadius: "0.75rem",
                color: "#E2E8F0",
              }}
              formatter={(value: number, name: string) => [
                formatSpeed(value),
                name === "rx" ? "Download" : "Upload",
              ]}
            />
            <Area type="monotone" dataKey="rx" stroke="#10B981" strokeWidth={2} fill="url(#rxGradient)" />
            <Area type="monotone" dataKey="tx" stroke="#3B82F6" strokeWidth={2} fill="url(#txGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Download
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> Upload
        </span>
      </div>
    </div>
  );
}
