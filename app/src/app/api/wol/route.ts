import { NextRequest } from "next/server";
import {
  getDevicesWithStatus,
  wakeDevice,
  addWolDevice,
  updateWolDevice,
  deleteWolDevice,
} from "@/lib/wol";

export async function GET() {
  try {
    const devices = await getDevicesWithStatus();
    return Response.json(devices);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to fetch WOL devices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "wake") {
      const { id } = body;
      if (!id) return Response.json({ error: "id required" }, { status: 400 });
      await wakeDevice(id);
      return Response.json({ success: true });
    }

    // Add new device
    const { name, macAddress, ipAddress } = body;
    if (!name || !macAddress) {
      return Response.json({ error: "name and macAddress required" }, { status: 400 });
    }

    const id = addWolDevice(name, macAddress, ipAddress);
    return Response.json({ id });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    updateWolDevice(id, updates);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    deleteWolDevice(id);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
