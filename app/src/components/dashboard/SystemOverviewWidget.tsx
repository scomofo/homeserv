"use client";

import { Cpu, MemoryStick, HardDrive } from "lucide-react";
import type { SystemSnapshot } from "@/hooks/useSystemMetrics";

function GaugeRing({ percent, color, size = 56 }: { percent: number; color: string; size?: number }) {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-200 dark:text-slate-700"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="progress-ring-circle"
      />
    </svg>
  );
}

export function SystemOverviewWidget({ metrics }: { metrics: SystemSnapshot | null }) {
  if (!metrics) {
    return (
      <div className="warm-card p-6 animate-pulse-warm">
        <div className="h-32 rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
    );
  }

  const mainDisk = metrics.disks[0];

  const gauges = [
    {
      label: "CPU",
      value: metrics.cpu.load,
      color: "#3B82F6",
      icon: Cpu,
    },
    {
      label: "RAM",
      value: metrics.memory.percent,
      color: "#06B6D4",
      icon: MemoryStick,
    },
    {
      label: "Disk",
      value: mainDisk?.percent ?? 0,
      color: mainDisk && mainDisk.percent > 90 ? "#EF4444" : "#10B981",
      icon: HardDrive,
    },
  ];

  return (
    <div className="warm-card p-6">
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-4">
        System Overview
      </h3>
      <div className="flex justify-around">
        {gauges.map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.label} className="flex flex-col items-center gap-2">
              <div className="relative">
                <GaugeRing percent={g.value} color={g.color} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              <span className="text-lg font-bold" style={{ color: g.color }}>
                {g.value.toFixed(0)}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{g.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
