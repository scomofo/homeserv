"use client";

import { useState, useEffect, useCallback } from "react";

export interface NetworkDevice {
  mac: string;
  ip: string;
  name: string;
  vendor: string;
  ports: { port: number; label: string }[];
  lastSeen: string;
  firstSeen: string;
  status: "online" | "offline";
}

export function useNetworkDevices() {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/network");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDevices(data.devices);
      setScanning(data.scanning);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 30_000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  const triggerScan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices);
      }
    } catch {
      // Will pick up via next poll
    } finally {
      setScanning(false);
    }
  }, []);

  const removeDevice = useCallback(
    async (mac: string) => {
      await fetch("/api/network", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mac }),
      });
      fetchDevices();
    },
    [fetchDevices]
  );

  const renameDevice = useCallback(
    async (mac: string, name: string) => {
      await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", mac, name }),
      });
      fetchDevices();
    },
    [fetchDevices]
  );

  const promoteDevice = useCallback(
    async (mac: string, room?: string) => {
      await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "promote", mac, room }),
      });
      fetchDevices();
    },
    [fetchDevices]
  );

  return {
    devices,
    loading,
    scanning,
    error,
    triggerScan,
    removeDevice,
    renameDevice,
    promoteDevice,
    refetch: fetchDevices,
  };
}
