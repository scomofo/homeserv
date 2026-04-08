"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Monitor, Maximize, Minimize, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DesktopPage() {
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [wsPort, setWsPort] = useState(3002);
  const containerRef = useRef<HTMLDivElement>(null);
  const vncRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rfbRef = useRef<any>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((settings) => {
        if (settings.vnc_ws_port) {
          setWsPort(parseInt(settings.vnc_ws_port, 10));
        }
      })
      .catch(() => {});
  }, []);

  // Load noVNC from CDN
  const loadNoVNC = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if ((window as unknown as Record<string, unknown>).__noVNCLoaded) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.type = "module";
      script.textContent = [
        "import RFB from 'https://cdn.jsdelivr.net/npm/@novnc/novnc@1.5.0/core/rfb.js';",
        "window.__noVNC_RFB = RFB;",
        "window.__noVNCLoaded = true;",
        "window.dispatchEvent(new Event('novnc-loaded'));",
      ].join("\n");
      document.head.appendChild(script);

      const onLoad = () => {
        window.removeEventListener("novnc-loaded", onLoad);
        resolve();
      };
      window.addEventListener("novnc-loaded", onLoad);

      setTimeout(() => {
        window.removeEventListener("novnc-loaded", onLoad);
        reject(new Error("Failed to load noVNC library"));
      }, 10000);
    });
  }, []);

  async function connect() {
    setError(null);
    setStatus("connecting");

    try {
      await loadNoVNC();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const RFB = (window as unknown as Record<string, any>).__noVNC_RFB;
      if (!RFB) {
        throw new Error("noVNC library failed to initialize");
      }

      if (!vncRef.current) {
        throw new Error("VNC container not ready");
      }

      // Clear previous content safely
      while (vncRef.current.firstChild) {
        vncRef.current.removeChild(vncRef.current.firstChild);
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.hostname}:${wsPort}`;

      const rfb = new RFB(vncRef.current, wsUrl, {
        wsProtocols: [],
      });

      rfb.scaleViewport = true;
      rfb.resizeSession = true;

      rfb.addEventListener("connect", () => {
        setStatus("connected");
        setError(null);
      });

      rfb.addEventListener("disconnect", (e: { detail: { clean: boolean } }) => {
        setStatus("idle");
        rfbRef.current = null;
        if (!e.detail.clean) {
          setError("Connection lost unexpectedly");
        }
      });

      rfb.addEventListener("securityfailure", (e: { detail: { reason: string } }) => {
        setStatus("error");
        setError(`Authentication failed: ${e.detail.reason || "check VNC password in Settings"}`);
      });

      rfbRef.current = rfb;
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Connection failed");
    }
  }

  function disconnect() {
    if (rfbRef.current) {
      rfbRef.current.disconnect();
      rfbRef.current = null;
    }
    setStatus("idle");
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
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      if (rfbRef.current) {
        rfbRef.current.disconnect();
        rfbRef.current = null;
      }
    };
  }, []);

  const connected = status === "connected";

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
              connected ? "bg-emerald-500" : status === "connecting" ? "bg-amber-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"
            )}
          />
          <span className="text-sm text-slate-500">
            {status === "connecting" ? "Connecting..." : connected ? "Connected" : "Disconnected"}
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
              disabled={status === "connecting"}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition disabled:opacity-50"
            >
              {status === "connecting" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Connect
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
        {connected || status === "connecting" ? (
          <div className="relative bg-black" style={{ minHeight: "60vh" }}>
            <div ref={vncRef} className="w-full h-full" style={{ minHeight: "60vh" }} />
            {status === "connecting" && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
                  <p className="text-sm opacity-70">Connecting to VNC server...</p>
                </div>
              </div>
            )}
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
                <p><strong>Setup:</strong></p>
                <p>1. Install a VNC server (TightVNC, RealVNC, etc.)</p>
                <p>2. Configure VNC host/port in <a href="/settings" className="text-blue-500 hover:underline">Settings</a></p>
                <p>3. Click Connect above</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
