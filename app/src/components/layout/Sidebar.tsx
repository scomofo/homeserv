"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppShell } from "./AppShell";
import {
  LayoutDashboard,
  Activity,
  Radar,
  Lightbulb,
  FolderOpen,
  Film,
  Monitor,
  Power,
  Settings,
  Server,
  Sun,
  Moon,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/system", label: "System", icon: Activity },
  { href: "/network", label: "Network", icon: Radar },
  { href: "/devices", label: "Devices", icon: Lightbulb },
  { href: "/files", label: "Files", icon: FolderOpen },
  { href: "/media", label: "Media", icon: Film },
  { href: "/desktop", label: "Desktop", icon: Monitor },
  { href: "/wake", label: "Wake", icon: Power },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { darkMode, toggleDarkMode } = useAppShell();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-slate-900 dark:bg-slate-950 border-t border-slate-800 h-16 px-1 pb-[env(safe-area-inset-bottom)]">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center rounded-2xl py-1.5 px-2 transition-all duration-200 gap-0.5",
                pathname === item.href
                  ? "text-blue-400"
                  : "text-slate-400 hover:text-blue-300"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-20 flex flex-col items-center py-4 gap-1 bg-slate-900 dark:bg-slate-950 border-r border-slate-800 z-50">
      {/* Logo */}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/20">
        <Server className="w-6 h-6" />
      </div>

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-1 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full rounded-2xl py-2 px-1 transition-all duration-200 gap-1",
                pathname === item.href
                  ? "bg-blue-500/20 text-blue-400 shadow-inner"
                  : "text-slate-400 hover:text-blue-300 hover:bg-slate-800/60"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 hover:text-blue-300 hover:bg-slate-800/60 transition-all duration-200 mb-2"
        title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </aside>
  );
}
