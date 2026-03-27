"use client";

import { useSystemMetrics } from "@/hooks/useSystemMetrics";
import { SystemOverviewWidget } from "@/components/dashboard/SystemOverviewWidget";
import { UptimeWidget } from "@/components/dashboard/UptimeWidget";
import { NetworkWidget } from "@/components/dashboard/NetworkWidget";
import { QuickActionsWidget } from "@/components/dashboard/QuickActionsWidget";
import { DeviceStatusWidget } from "@/components/dashboard/DeviceStatusWidget";
import { NetworkDevicesWidget } from "@/components/dashboard/NetworkDevicesWidget";
import { Server } from "lucide-react";

export default function DashboardPage() {
  const { metrics } = useSystemMetrics();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-md">
          <Server className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            HomeServ
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Home Server Dashboard
          </p>
        </div>
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
        <SystemOverviewWidget metrics={metrics} />
        <UptimeWidget metrics={metrics} />
        <NetworkWidget metrics={metrics} />
        <DeviceStatusWidget />
        <NetworkDevicesWidget />
        <QuickActionsWidget />
      </div>
    </div>
  );
}
