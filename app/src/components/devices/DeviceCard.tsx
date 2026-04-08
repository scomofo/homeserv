"use client";

import {
  Lightbulb,
  ToggleLeft,
  ToggleRight,
  Thermometer,
  Eye,
  Lock,
  Unlock,
  Wind,
  Tv,
  ChevronUp,
  ChevronDown,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UnifiedDevice } from "@/hooks/useDevices";

interface DeviceCardProps {
  device: UnifiedDevice;
  onControl: (action: string, params?: Record<string, unknown>) => void;
}

function getDeviceIcon(type: string) {
  switch (type) {
    case "light": return Lightbulb;
    case "switch": return ToggleLeft;
    case "thermostat": return Thermometer;
    case "sensor": return Eye;
    case "lock": return Lock;
    case "cover": return ChevronUp;
    case "fan": return Wind;
    case "media_player": return Tv;
    default: return ToggleLeft;
  }
}

function isOn(state: Record<string, unknown>): boolean {
  const s = String(state.state || "").toLowerCase();
  return s === "on" || s === "true" || s === "playing" || s === "unlocked" || s === "open";
}

export function DeviceCard({ device, onControl }: DeviceCardProps) {
  const Icon = getDeviceIcon(device.type);
  const on = isOn(device.state);
  const stateStr = String(device.state.state || "unknown");
  const temperature = device.state.current_temperature as number | undefined;
  const targetTemp = device.state.temperature as number | undefined;
  const brightness = device.state.brightness_pct as number | undefined;
  const unit = (device.state.unit_of_measurement as string) || "";
  const cap = device.capabilities;

  return (
    <div
      className={cn(
        "warm-card p-4 transition-all",
        on && "ring-2 ring-blue-500/30"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center",
              on
                ? "bg-blue-500/20 text-blue-500"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400"
            )}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-tight">
              {device.name}
            </h4>
            {device.room && (
              <p className="text-[10px] text-slate-400">{device.room}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {device.available ? (
            <Wifi className="w-3 h-3 text-emerald-500" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-400" />
          )}
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full",
              device.source === "ha"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                : device.source === "mqtt"
                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
            )}
          >
            {device.source.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Controls based on capabilities */}
      {device.type === "sensor" ? (
        <div className="text-center py-2">
          <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {stateStr}
          </span>
          {unit && <span className="text-sm text-slate-500 ml-1">{unit}</span>}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Temperature controls */}
          {cap.canSetTemperature && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Current</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {temperature ?? "--"}&deg;
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Target</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onControl("set_temperature", { temperature: (targetTemp || 20) - 0.5 })}
                    className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <span className="text-lg font-bold text-slate-800 dark:text-slate-100 w-10 text-center">
                    {targetTemp ?? "--"}&deg;
                  </span>
                  <button
                    onClick={() => onControl("set_temperature", { temperature: (targetTemp || 20) + 0.5 })}
                    className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lock control */}
          {cap.canLock && (
            <button
              onClick={() => onControl(on ? "lock" : "unlock")}
              className={cn(
                "w-full py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                on
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30"
                  : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30"
              )}
            >
              {on ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {on ? "Unlocked" : "Locked"}
            </button>
          )}

          {/* Toggle control */}
          {cap.canToggle && !cap.canLock && (
            <button
              onClick={() => onControl("toggle")}
              className={cn(
                "w-full py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2",
                on
                  ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-slate-300 dark:hover:bg-slate-600"
              )}
            >
              {on ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              {on ? "On" : "Off"}
            </button>
          )}

          {/* Brightness slider */}
          {cap.canDim && on && brightness !== undefined && (
            <div className="flex items-center gap-2 px-1">
              <Lightbulb className="w-3 h-3 text-slate-400" />
              <input
                type="range"
                min={1}
                max={100}
                value={brightness}
                onChange={(e) => onControl("set_brightness", { brightness: parseInt(e.target.value) })}
                className="flex-1 h-1.5 rounded-full appearance-none bg-slate-200 dark:bg-slate-700 accent-blue-500"
              />
              <span className="text-xs text-slate-400 w-8 text-right">{brightness}%</span>
            </div>
          )}

          {/* State display for non-interactive types without specific capabilities */}
          {!cap.canToggle && !cap.canLock && !cap.canSetTemperature && (
            <div className="text-center py-2">
              <span className="text-sm text-slate-500">{stateStr}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
