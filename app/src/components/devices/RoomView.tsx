"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { DeviceCard } from "./DeviceCard";
import type { UnifiedDevice } from "@/hooks/useDevices";

interface RoomViewProps {
  room: string;
  devices: UnifiedDevice[];
  onControl: (deviceId: string, action: string, params?: Record<string, unknown>) => void;
}

export function RoomView({ room, devices, onControl }: RoomViewProps) {
  const [expanded, setExpanded] = useState(true);

  const onlineCount = devices.filter((d) => d.available).length;
  const onCount = devices.filter((d) => {
    const s = String(d.state.state || "").toLowerCase();
    return s === "on" || s === "playing" || s === "unlocked" || s === "open";
  }).length;

  return (
    <div className="mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 mb-3 group"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-500 transition">
          {room}
        </h3>
        <span className="text-xs text-slate-400 ml-1">
          {onCount} on &middot; {onlineCount}/{devices.length} online
        </span>
      </button>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onControl={(action, params) => onControl(device.id, action, params)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
