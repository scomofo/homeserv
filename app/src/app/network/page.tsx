"use client";

import { useState } from "react";
import {
  Radar,
  RefreshCw,
  Loader2,
  Trash2,
  ArrowUpRight,
  Wifi,
  WifiOff,
  Pencil,
  Check,
  X,
  Shield,
  Globe,
  Terminal,
  Monitor,
  HardDrive,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useNetworkDevices,
  type NetworkDevice,
} from "@/hooks/useNetworkDevices";

type FilterStatus = "all" | "online" | "offline";

/** Color-code port badges by service category */
function portStyle(label: string): { bg: string; text: string; border: string } {
  switch (label) {
    case "HTTP":
    case "HTTPS":
    case "HTTP-Alt":
    case "HTTPS-Alt":
      return { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/25" };
    case "SSH":
    case "RDP":
    case "VNC":
      return { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/25" };
    case "SMB":
    case "NetBIOS":
      return { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/25" };
    default:
      return { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/25" };
  }
}

function portIcon(label: string) {
  switch (label) {
    case "HTTP":
    case "HTTPS":
    case "HTTP-Alt":
    case "HTTPS-Alt":
      return Globe;
    case "SSH":
      return Terminal;
    case "RDP":
    case "VNC":
      return Monitor;
    case "SMB":
    case "NetBIOS":
      return HardDrive;
    default:
      return Shield;
  }
}

/** SVG radar animation used during scanning */
function RadarAnimation({ size = 120 }: { size?: number }) {
  const cx = size / 2;
  const r = size / 2 - 4;
  return (
    <svg width={size} height={size} className="shrink-0">
      {/* Concentric rings */}
      {[0.33, 0.66, 1].map((scale) => (
        <circle
          key={scale}
          cx={cx}
          cy={cx}
          r={r * scale}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          className="text-violet-500/20"
        />
      ))}
      {/* Crosshairs */}
      <line x1={cx} y1={4} x2={cx} y2={size - 4} stroke="currentColor" strokeWidth={0.5} className="text-violet-500/15" />
      <line x1={4} y1={cx} x2={size - 4} y2={cx} stroke="currentColor" strokeWidth={0.5} className="text-violet-500/15" />
      {/* Sweep */}
      <g className="animate-radar-sweep" style={{ transformOrigin: `${cx}px ${cx}px` }}>
        <defs>
          <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(139 92 246)" stopOpacity="0" />
            <stop offset="100%" stopColor="rgb(139 92 246)" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx} ${cx} L ${cx} ${4} A ${r} ${r} 0 0 1 ${cx + r * Math.sin(Math.PI / 6)} ${cx - r * Math.cos(Math.PI / 6)} Z`}
          fill="url(#sweepGrad)"
        />
        <line x1={cx} y1={cx} x2={cx} y2={4} stroke="rgb(139 92 246)" strokeWidth={1.5} strokeLinecap="round" />
      </g>
      {/* Center dot */}
      <circle cx={cx} cy={cx} r={3} fill="rgb(139 92 246)" className="animate-beacon-pulse" style={{ color: "rgb(139 92 246)" }} />
      {/* Ping rings */}
      <circle cx={cx} cy={cx} r={8} fill="none" stroke="rgb(139 92 246)" strokeWidth={1} className="animate-radar-ping" />
    </svg>
  );
}

export default function NetworkPage() {
  const {
    devices,
    loading,
    scanning,
    triggerScan,
    removeDevice,
    renameDevice,
    promoteDevice,
  } = useNetworkDevices();

  const [filter, setFilter] = useState<FilterStatus>("all");
  const [editingMac, setEditingMac] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = devices
    .filter((d) => filter === "all" || d.status === filter)
    .filter((d) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.ip.includes(q) ||
        d.mac.toLowerCase().includes(q) ||
        d.vendor.toLowerCase().includes(q) ||
        d.ports.some((p) => p.label.toLowerCase().includes(q))
      );
    });

  const onlineCount = devices.filter((d) => d.status === "online").length;
  const offlineCount = devices.filter((d) => d.status === "offline").length;
  const totalPorts = devices.reduce((sum, d) => sum + d.ports.length, 0);

  function startEdit(device: NetworkDevice) {
    setEditingMac(device.mac);
    setEditName(device.name);
  }

  function cancelEdit() {
    setEditingMac(null);
    setEditName("");
  }

  async function saveEdit(mac: string) {
    if (editName.trim()) {
      await renameDevice(mac, editName.trim());
    }
    cancelEdit();
  }

  async function handlePromote(device: NetworkDevice) {
    if (
      confirm(
        `Promote "${device.name === "---" ? device.ip : device.name}" to the Devices page?`
      )
    ) {
      await promoteDevice(device.mac);
    }
  }

  async function handleDelete(mac: string) {
    if (confirm("Remove this device from scan history?")) {
      await removeDevice(mac);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto net-grid-bg min-h-[calc(100vh-2rem)]">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
              <Radar className="w-5 h-5" />
            </div>
            {scanning && (
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-violet-500 border-2 border-white dark:border-slate-900 animate-beacon-pulse" style={{ color: "rgb(139 92 246)" }} />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Network Scanner
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono tracking-wider mt-0.5">
              ARP DISCOVERY &middot; PORT SCAN &middot; DEVICE INVENTORY
            </p>
          </div>
        </div>

        <button
          onClick={triggerScan}
          disabled={scanning}
          className={cn(
            "flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300 shadow-lg",
            scanning
              ? "bg-violet-500/20 text-violet-400 cursor-not-allowed shadow-none"
              : "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm"
          )}
        >
          {scanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning Network...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Scan Network
            </>
          )}
        </button>
      </div>

      {/* ── Scanning Hero ── */}
      {scanning && (
        <div className="warm-card p-8 mb-8 flex flex-col items-center justify-center gap-4 animate-fade-in border-violet-500/20">
          <RadarAnimation size={140} />
          <div className="text-center">
            <p className="text-sm font-semibold text-violet-500">Scanning local network...</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">
              Discovering devices via ARP &middot; Probing ports &middot; Resolving names
            </p>
          </div>
        </div>
      )}

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 stagger-children">
        {/* Total */}
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "warm-card p-5 text-left transition-all duration-200 cursor-pointer group",
            filter === "all" && "ring-2 ring-violet-500/40 shadow-lg shadow-violet-500/5"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <Radar className="w-4 h-4 text-violet-500" />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              filter === "all" ? "text-violet-500" : "text-slate-400"
            )}>Total</span>
          </div>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 animate-count-up">
            {devices.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">devices found</p>
        </button>

        {/* Online */}
        <button
          onClick={() => setFilter("online")}
          className={cn(
            "warm-card p-5 text-left transition-all duration-200 cursor-pointer group",
            filter === "online" && "ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/5"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <Wifi className="w-4 h-4 text-emerald-500" />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              filter === "online" ? "text-emerald-500" : "text-slate-400"
            )}>Online</span>
          </div>
          <p className="text-3xl font-bold text-emerald-500 animate-count-up">
            {onlineCount}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-beacon-pulse" style={{ color: "rgb(16 185 129)" }} />
            <span className="text-[11px] text-slate-400 font-mono">responding</span>
          </div>
        </button>

        {/* Offline */}
        <button
          onClick={() => setFilter("offline")}
          className={cn(
            "warm-card p-5 text-left transition-all duration-200 cursor-pointer group",
            filter === "offline" && "ring-2 ring-slate-400/30 shadow-lg"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <WifiOff className="w-4 h-4 text-slate-400" />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest",
              filter === "offline" ? "text-slate-300" : "text-slate-400"
            )}>Offline</span>
          </div>
          <p className="text-3xl font-bold text-slate-400 animate-count-up">
            {offlineCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">last seen</p>
        </button>

        {/* Open Ports */}
        <div className="warm-card p-5 text-left">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-4 h-4 text-cyan-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ports</span>
          </div>
          <p className="text-3xl font-bold text-cyan-500 animate-count-up">
            {totalPorts}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">open services</p>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, IP, MAC, vendor, or port..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition font-mono"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Device Table ── */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="warm-card p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-500/10 mb-4">
            <Radar className="w-8 h-8 text-violet-500/50" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {devices.length === 0
              ? "No devices discovered yet. Hit Scan Network to begin."
              : "No devices match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-2 scan-stagger">
          {filtered.map((device) => (
            <div
              key={device.mac}
              className="warm-card net-device-row p-4 sm:p-5 animate-scan-line"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                {/* Status beacon + Name block */}
                <div className="flex items-center gap-3 min-w-0 sm:w-56 shrink-0">
                  <div className="relative shrink-0">
                    <div
                      className={cn(
                        "w-3.5 h-3.5 rounded-full",
                        device.status === "online"
                          ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                          : "bg-slate-300 dark:bg-slate-600"
                      )}
                    />
                  </div>

                  {editingMac === device.mac ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(device.mac);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="flex-1 min-w-0 px-2.5 py-1 text-sm rounded-xl border border-violet-500/30 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        autoFocus
                      />
                      <button onClick={() => saveEdit(device.mac)} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-lg">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={cancelEdit} className="p-1 text-slate-400 hover:bg-slate-400/10 rounded-lg">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="min-w-0 group/name">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {device.name}
                        </span>
                        <button
                          onClick={() => startEdit(device)}
                          className="opacity-0 group-hover/name:opacity-100 p-0.5 text-slate-400 hover:text-violet-500 transition-opacity"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{device.vendor}</p>
                    </div>
                  )}
                </div>

                {/* IP Address */}
                <div className="sm:w-36 shrink-0">
                  <span className="font-mono text-sm text-slate-700 dark:text-slate-200 tracking-wide">
                    {device.ip}
                  </span>
                </div>

                {/* MAC */}
                <div className="hidden lg:block lg:w-40 shrink-0">
                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                    {device.mac}
                  </span>
                </div>

                {/* Ports */}
                <div className="flex-1 min-w-0">
                  {device.ports.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {device.ports.map((p) => {
                        const style = portStyle(p.label);
                        const Icon = portIcon(p.label);
                        return (
                          <span
                            key={p.port}
                            className={cn(
                              "port-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border",
                              style.bg,
                              style.text,
                              style.border
                            )}
                          >
                            <Icon className="w-2.5 h-2.5" />
                            {p.label}
                            <span className="opacity-60">:{p.port}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">No open ports</span>
                  )}
                </div>

                {/* Last seen */}
                <div className="hidden sm:block sm:w-32 shrink-0 text-right">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(device.lastSeen).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handlePromote(device)}
                    title="Promote to Devices"
                    className="p-2 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-all"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(device.mac)}
                    title="Remove"
                    className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer info ── */}
      {devices.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono tracking-wider">
            {filtered.length} of {devices.length} devices shown
            {searchQuery && ` &middot; searching "${searchQuery}"`}
            {filter !== "all" && ` &middot; filter: ${filter}`}
          </p>
        </div>
      )}
    </div>
  );
}
