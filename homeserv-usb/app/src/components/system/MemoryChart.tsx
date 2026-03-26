"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface MemoryChartProps {
  history: { time: string; value: number }[];
  total: number;
  used: number;
  percent: number;
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

export function MemoryChart({ history, total, used, percent }: MemoryChartProps) {
  return (
    <div className="warm-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
          Memory
        </h3>
        <span className="text-2xl font-bold text-cyan-500">
          {percent.toFixed(1)}%
        </span>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              contentStyle={{
                background: "rgba(30, 41, 59, 0.9)",
                border: "1px solid #334155",
                borderRadius: "0.75rem",
                color: "#E2E8F0",
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, "RAM"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#06B6D4"
              strokeWidth={2}
              fill="url(#memGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{formatBytes(used)} used</span>
        <span>{formatBytes(total)} total</span>
      </div>
    </div>
  );
}
