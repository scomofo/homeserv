import { NextRequest } from "next/server";
import { getAllDevices, controlDevice, updateDeviceOverride } from "@/lib/device-manager";
import { db } from "@/lib/db";
import { devices } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allDevices = await getAllDevices();
    return Response.json(allDevices);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to fetch devices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { deviceId, action, params } = await request.json();

    if (!deviceId || !action) {
      return Response.json({ error: "deviceId and action required" }, { status: 400 });
    }

    await controlDevice(deviceId, action, params);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Control failed" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { deviceId, name, room } = await request.json();

    if (!deviceId) {
      return Response.json({ error: "deviceId required" }, { status: 400 });
    }

    updateDeviceOverride(deviceId, { name, room });
    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { deviceId } = await request.json();

    if (!deviceId) {
      return Response.json({ error: "deviceId required" }, { status: 400 });
    }

    db.delete(devices).where(eq(devices.id, deviceId)).run();
    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    );
  }
}
