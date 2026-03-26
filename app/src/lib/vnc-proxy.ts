import { getSetting } from "./settings";

export function getVncConfig(): {
  host: string;
  port: number;
  wsPort: number;
  configured: boolean;
} {
  const host = getSetting("vnc_host", "localhost");
  const port = parseInt(getSetting("vnc_port", "5900"), 10);
  const wsPort = parseInt(getSetting("vnc_ws_port", "3002"), 10);

  return {
    host,
    port,
    wsPort,
    configured: !!getSetting("vnc_host"),
  };
}
