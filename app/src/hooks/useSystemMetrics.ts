"use client";

import { useState, useEffect, useRef } from "react";

export interface SystemSnapshot {
  cpu: { load: number; cores: number[] };
  memory: { total: number; used: number; free: number; percent: number };
  disks: { fs: string; size: number; used: number; mount: string; percent: number }[];
  network: { iface: string; rxSec: number; txSec: number }[];
  temps: { main: number; cores: { temp: number }[] } | null;
  os: { platform: string; distro: string; hostname: string };
  uptime: number;
}

export function useSystemMetrics() {
  const [metrics, setMetrics] = useState<SystemSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/system/sse");
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMetrics(data);
      } catch {
        // Skip malformed messages
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  return { metrics, connected };
}
