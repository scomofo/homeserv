"use client";

import { useState } from "react";
import { Lightbulb, LayoutGrid, List, RefreshCw } from "lucide-react";
import { useDevices } from "@/hooks/useDevices";
import { DeviceCard } from "@/components/devices/DeviceCard";
import { RoomView } from "@/components/devices/RoomView";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type ViewMode = "room" | "type" | "all";

export default function DevicesPage() {
  const { devices, loading, error, refetch, controlDevice } = useDevices();
  const [viewMode, setViewMode] = useState<ViewMode>("room");

  const rooms = new Map<string, typeof devices>();
  const types = new Map<string, typeof devices>();

  for (const device of devices) {
    const room = device.room || "Unassigned";
    if (!rooms.has(room)) rooms.set(room, []);
    rooms.get(room)!.push(device);

    const type = device.type;
    if (!types.has(type)) types.set(type, []);
    types.get(type)!.push(device);
  }

  const onlineCount = devices.filter((d) => d.available).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Devices</h1>
          <span className="text-sm text-slate-400">
            {onlineCount}/{devices.length} online
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          {(["room", "type", "all"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition",
                viewMode === mode
                  ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              )}
            >
              {mode === "room" ? (
                <span className="flex items-center gap-1"><LayoutGrid className="w-3.5 h-3.5" /> Rooms</span>
              ) : mode === "type" ? (
                <span className="flex items-center gap-1"><List className="w-3.5 h-3.5" /> Types</span>
              ) : (
                "All"
              )}
            </button>
          ))}

          <button
            onClick={refetch}
            className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="warm-card p-4 mb-6 text-red-500 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="warm-card p-8 text-center">
          <Lightbulb className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">
            No devices found. Configure Home Assistant or MQTT in{" "}
            <a href="/settings" className="text-blue-500 hover:underline">Settings</a>{" "}
            to see your devices here.
          </p>
        </div>
      ) : viewMode === "room" ? (
        // Group by room
        Array.from(rooms.entries())
          .sort(([a], [b]) => (a === "Unassigned" ? 1 : b === "Unassigned" ? -1 : a.localeCompare(b)))
          .map(([room, roomDevices]) => (
            <RoomView
              key={room}
              room={room}
              devices={roomDevices}
              onControl={controlDevice}
            />
          ))
      ) : viewMode === "type" ? (
        // Group by type
        Array.from(types.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([type, typeDevices]) => (
            <RoomView
              key={type}
              room={type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ")}
              devices={typeDevices}
              onControl={controlDevice}
            />
          ))
      ) : (
        // Flat grid
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onControl={(action, params) => controlDevice(device.id, action, params)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
