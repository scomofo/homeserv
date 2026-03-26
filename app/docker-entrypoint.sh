#!/bin/sh
set -e

echo "╔══════════════════════════════════════╗"
echo "║         HomeServ Starting...         ║"
echo "╚══════════════════════════════════════╝"

# Start VNC WebSocket proxy in background (if ws module available)
if [ -d "node_modules/ws" ]; then
  echo "[HomeServ] Starting VNC WebSocket proxy on port ${VNC_WS_PORT:-3002}..."
  node -e "
    const { WebSocketServer, WebSocket } = require('ws');
    const net = require('net');
    const VNC_HOST = process.env.VNC_HOST || 'localhost';
    const VNC_PORT = parseInt(process.env.VNC_PORT || '5900', 10);
    const WS_PORT = parseInt(process.env.VNC_WS_PORT || '3002', 10);
    const wss = new WebSocketServer({ port: WS_PORT });
    console.log('[VNC Proxy] Listening on port ' + WS_PORT);
    wss.on('connection', (ws) => {
      const tcp = net.createConnection({ host: VNC_HOST, port: VNC_PORT });
      tcp.on('data', (d) => ws.readyState === WebSocket.OPEN && ws.send(d));
      tcp.on('end', () => ws.close());
      tcp.on('error', () => ws.close());
      ws.on('message', (d) => !tcp.destroyed && tcp.write(d));
      ws.on('close', () => tcp.destroy());
      ws.on('error', () => tcp.destroy());
    });
  " &
fi

echo "[HomeServ] Starting Next.js server on port ${PORT:-3001}..."
exec node server.js
