"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Power,
  Plus,
  Trash2,
  RefreshCw,
  Loader2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

interface WolDevice {
  id: string;
  name: string;
  macAddress: string;
  ipAddress: string | null;
  lastWake: string | null;
  online?: boolean;
}

export default function WakePage() {
  const [devices, setDevices] = useState<WolDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [waking, setWaking] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMac, setNewMac] = useState("");
  const [newIp, setNewIp] = useState("");

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/wol");
      if (res.ok) {
        const data = await res.json();
        setDevices(data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 30_000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  async function handleWake(id: string) {
    setWaking(id);
    try {
      await fetch("/api/wol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "wake", id }),
      });
      // Wait a moment then refresh
      setTimeout(fetchDevices, 3000);
    } catch {
      // Ignore
    } finally {
      setTimeout(() => setWaking(null), 2000);
    }
  }

  async function handleAdd() {
    if (!newName || !newMac) return;

    await fetch("/api/wol", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, macAddress: newMac, ipAddress: newIp || undefined }),
    });

    setNewName("");
    setNewMac("");
    setNewIp("");
    setShowAdd(false);
    fetchDevices();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this device?")) return;
    await fetch("/api/wol", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchDevices();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Power className="w-6 h-6 text-red-500" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Wake-on-LAN</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDevices}
            className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition"
          >
            <Plus className="w-4 h-4" /> Add Device
          </button>
        </div>
      </div>

      {/* Add device form */}
      {showAdd && (
        <div className="warm-card p-5 mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Add WOL Device</h3>
            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Device Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <input
              type="text"
              placeholder="MAC Address (AA:BB:CC:DD:EE:FF)"
              value={newMac}
              onChange={(e) => setNewMac(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <input
              type="text"
              placeholder="IP Address (optional, for ping)"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!newName || !newMac}
            className="mt-3 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold shadow-md hover:shadow-lg transition disabled:opacity-50"
          >
            Add Device
          </button>
        </div>
      )}

      {/* Device list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="warm-card p-8 text-center">
          <Power className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">
            No WOL devices configured. Click &quot;Add Device&quot; to add one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => (
            <div key={device.id} className="warm-card p-4 flex items-center gap-4">
              {/* Status indicator */}
              <div
                className={cn(
                  "w-3 h-3 rounded-full shrink-0",
                  device.online ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300 dark:bg-slate-600"
                )}
              />

              {/* Device info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {device.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{device.macAddress}</span>
                  {device.ipAddress && <span>{device.ipAddress}</span>}
                  {device.lastWake && (
                    <span>
                      Last wake: {new Date(device.lastWake).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Status badge */}
              <div className="flex items-center gap-1 text-xs shrink-0">
                {device.online ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-500">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-400">Offline</span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleWake(device.id)}
                  disabled={waking === device.id}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition",
                    device.online
                      ? "bg-slate-200 dark:bg-slate-700 text-slate-500 cursor-default"
                      : "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                  )}
                >
                  {waking === device.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                  {waking === device.id ? "Waking..." : "Wake"}
                </button>
                <button
                  onClick={() => handleDelete(device.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-500 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
