/**
 * Standalone WebSocket proxy for noVNC.
 * Bridges WebSocket connections from the browser to a local VNC server over TCP.
 *
 * Run separately alongside Next.js:
 *   npx tsx vnc-server.ts
 *
 * Or via the start script.
 */

import { WebSocketServer, WebSocket } from "ws";
import net from "net";

const VNC_HOST = process.env.VNC_HOST || "localhost";
const VNC_PORT = parseInt(process.env.VNC_PORT || "5900", 10);
const WS_PORT = parseInt(process.env.VNC_WS_PORT || "3002", 10);

const wss = new WebSocketServer({ port: WS_PORT });

console.log(`[VNC Proxy] WebSocket server listening on port ${WS_PORT}`);
console.log(`[VNC Proxy] Proxying to VNC server at ${VNC_HOST}:${VNC_PORT}`);

wss.on("connection", (ws: WebSocket) => {
  console.log("[VNC Proxy] Client connected");

  const tcp = net.createConnection({ host: VNC_HOST, port: VNC_PORT }, () => {
    console.log("[VNC Proxy] Connected to VNC server");
  });

  tcp.on("data", (data: Buffer) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });

  tcp.on("end", () => {
    console.log("[VNC Proxy] VNC server disconnected");
    ws.close();
  });

  tcp.on("error", (err: Error) => {
    console.error("[VNC Proxy] TCP error:", err.message);
    ws.close();
  });

  ws.on("message", (data: Buffer) => {
    if (!tcp.destroyed) {
      tcp.write(data);
    }
  });

  ws.on("close", () => {
    console.log("[VNC Proxy] Client disconnected");
    tcp.destroy();
  });

  ws.on("error", (err: Error) => {
    console.error("[VNC Proxy] WebSocket error:", err.message);
    tcp.destroy();
  });
});
