import { NextRequest } from "next/server";
import {
  runNetworkScan,
  getAllNetworkDevices,
  deleteNetworkDevice,
  updateNetworkDeviceName,
  promoteNetworkDevice,
} from "@/lib/network-scanner";

let scanning = false;

export async function GET(request: NextRequest) {
  try {
    const status = request.nextUrl.searchParams.get("status") as
      | "online"
      | "offline"
      | null;
    const devices = getAllNetworkDevices(status || undefined);
    return Response.json({ devices, scanning });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to fetch network devices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "scan") {
      if (scanning) {
        return Response.json(
          { error: "Scan already in progress" },
          { status: 409 }
        );
      }
      scanning = true;
      try {
        const devices = await runNetworkScan();
        return Response.json({ devices, scanning: false });
      } finally {
        scanning = false;
      }
    }

    if (action === "rename") {
      const { mac, name } = body;
      if (!mac || !name) {
        return Response.json({ error: "mac and name required" }, { status: 400 });
      }
      updateNetworkDeviceName(mac, name);
      return Response.json({ success: true });
    }

    if (action === "promote") {
      const { mac, room } = body;
      if (!mac) {
        return Response.json({ error: "mac required" }, { status: 400 });
      }
      const id = promoteNetworkDevice(mac, room);
      return Response.json({ id });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { mac } = await request.json();
    if (!mac) return Response.json({ error: "mac required" }, { status: 400 });
    deleteNetworkDevice(mac);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
