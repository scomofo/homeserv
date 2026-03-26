"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface CpuChartProps {
  history: { time: string; value: number }[];
  currentLoad: number;
  cores: number[];
}

export function CpuChart({ history, currentLoad, cores }: CpuChartProps) {
  return (
    <div className="warm-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
          CPU Usage
        </h3>
        <span className="text-2xl font-bold text-blue-500">
          {currentLoad.toFixed(1)}%
        </span>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
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
              formatter={(value: number) => [`${value.toFixed(1)}%`, "CPU"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#cpuGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Per-core bars */}
      <div className="mt-4 grid grid-cols-4 gap-1.5">
        {cores.map((load, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${load}%` }}
              />
            </div>
            <span className="text-[9px] text-slate-400">{load.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
