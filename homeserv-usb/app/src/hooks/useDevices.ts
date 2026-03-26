"use client";

import { useState, useEffect, useCallback } from "react";

export interface UnifiedDevice {
  id: string;
  name: string;
  type: "light" | "switch" | "thermostat" | "sensor" | "lock" | "cover" | "fan" | "media_player" | "other";
  room: string | null;
  source: "ha" | "mqtt" | "direct";
  state: Record<string, unknown>;
  available: boolean;
  lastSeen: string | null;
  sourceId: string;
}

export function useDevices() {
  const [devices, setDevices] = useState<UnifiedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/devices");
      if (!res.ok) throw new Error("Failed to fetch devices");
      const data = await res.json();
      setDevices(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 5000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  const controlDevice = useCallback(
    async (deviceId: string, action: string, params?: Record<string, unknown>) => {
      try {
        await fetch("/api/devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, action, params }),
        });
        // Refresh after control
        setTimeout(fetchDevices, 500);
      } catch {
        // Ignore control errors
      }
    },
    [fetchDevices]
  );

  return { devices, loading, error, refetch: fetchDevices, controlDevice };
}
