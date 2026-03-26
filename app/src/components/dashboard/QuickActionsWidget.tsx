"use client";

import Link from "next/link";
import { Activity, FolderOpen, Monitor, Power, Lightbulb, Film } from "lucide-react";

const actions = [
  { href: "/system", label: "System", icon: Activity, color: "text-blue-500" },
  { href: "/devices", label: "Devices", icon: Lightbulb, color: "text-amber-500" },
  { href: "/files", label: "Files", icon: FolderOpen, color: "text-emerald-500" },
  { href: "/media", label: "Media", icon: Film, color: "text-purple-500" },
  { href: "/desktop", label: "Desktop", icon: Monitor, color: "text-cyan-500" },
  { href: "/wake", label: "Wake", icon: Power, color: "text-red-500" },
];

export function QuickActionsWidget() {
  return (
    <div className="warm-card p-6">
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-4">
        Quick Actions
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            >
              <Icon className={`w-6 h-6 ${action.color}`} />
              <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
