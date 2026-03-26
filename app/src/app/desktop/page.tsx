"use client";

import { useState, useEffect, useRef } from "react";
import { Monitor, Maximize, Minimize, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DesktopPage() {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [wsPort, setWsPort] = useState(3002);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Fetch VNC config
    fetch("/api/settings")
      .then((r) => r.json())
      .then((settings) => {
        if (settings.vnc_ws_port) {
          setWsPort(parseInt(settings.vnc_ws_port, 10));
        }
      })
      .catch(() => {});
  }, []);

  function connect() {
    setError(null);
    setConnected(false);

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.hostname}:${wsPort}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };

      ws.onclose = () => {
        setConnected(false);
      };

      ws.onerror = () => {
        setError(
          "Cannot connect to VNC proxy. Make sure the VNC proxy server is running (npx tsx vnc-server.ts) and a VNC server is installed."
        );
        setConnected(false);
      };

      ws.onmessage = () => {
        // VNC protocol handling would go here
        // For a full implementation, integrate noVNC library
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    }
  }

  function disconnect() {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Monitor className="w-6 h-6 text-cyan-500" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Remote Desktop</h1>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              connected ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
            )}
          />
          <span className="text-sm text-slate-500">
            {connected ? "Connected" : "Disconnected"}
          </span>
          {connected ? (
            <>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
              <button
                onClick={disconnect}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-500/30 transition"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={connect}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Connect
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="warm-card p-4 mb-6 flex items-start gap-3 text-red-500">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      <div ref={containerRef} className="warm-card overflow-hidden">
        {connected ? (
          <div className="relative bg-black aspect-video flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm opacity-70">
                  VNC WebSocket connected. For full desktop streaming,
                  integrate the noVNC library into public/noVNC/ and
                  import its RFB client here.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="aspect-video bg-slate-100 dark:bg-slate-800/60 flex flex-col items-center justify-center gap-4 p-8">
            <Monitor className="w-16 h-16 text-slate-300 dark:text-slate-600" />
            <div className="text-center max-w-md">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                Remote Desktop Access
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                View and control your desktop remotely through your browser.
              </p>
              <div className="text-left text-xs text-slate-400 space-y-1">
                <p><strong>Setup required:</strong></p>
                <p>1. Install a VNC server (TightVNC, UltraVNC, or RealVNC)</p>
                <p>2. Configure VNC host/port in <a href="/settings" className="text-blue-500 hover:underline">Settings</a></p>
                <p>3. Start the VNC proxy: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">npx tsx vnc-server.ts</code></p>
                <p>4. Click Connect above</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
