import dgram from "dgram";
import { exec } from "child_process";
import { db } from "./db";
import { wolDevices } from "./schema";
import { eq } from "drizzle-orm";

export function sendMagicPacket(
  mac: string,
  broadcastAddress: string = "255.255.255.255"
): Promise<void> {
  return new Promise((resolve, reject) => {
    const macClean = mac.replace(/[:-]/g, "");
    if (macClean.length !== 12) {
      reject(new Error("Invalid MAC address"));
      return;
    }

    const macBytes = Buffer.from(macClean, "hex");
    const packet = Buffer.alloc(102);

    // 6 bytes of 0xFF
    packet.fill(0xff, 0, 6);

    // 16 repetitions of the MAC address
    for (let i = 0; i < 16; i++) {
      macBytes.copy(packet, 6 + i * 6);
    }

    const socket = dgram.createSocket("udp4");

    socket.once("error", (err) => {
      socket.close();
      reject(err);
    });

    socket.bind(() => {
      socket.setBroadcast(true);
      socket.send(packet, 0, packet.length, 9, broadcastAddress, (err) => {
        socket.close();
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

export function pingHost(ip: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Windows ping: -n 1 (count), -w 1000 (timeout ms)
    const cmd =
      process.platform === "win32"
        ? `ping -n 1 -w 1000 ${ip}`
        : `ping -c 1 -W 1 ${ip}`;

    exec(cmd, (error) => {
      resolve(!error);
    });
  });
}

export interface WolDevice {
  id: string;
  name: string;
  macAddress: string;
  ipAddress: string | null;
  lastWake: string | null;
  online?: boolean;
}

export function getWolDevices(): WolDevice[] {
  return db.select().from(wolDevices).all();
}

export function addWolDevice(name: string, macAddress: string, ipAddress?: string): string {
  const id = crypto.randomUUID();
  db.insert(wolDevices).values({
    id,
    name,
    macAddress,
    ipAddress: ipAddress || null,
  }).run();
  return id;
}

export function updateWolDevice(id: string, updates: { name?: string; macAddress?: string; ipAddress?: string }): void {
  const setFields: Record<string, string | null> = {};
  if (updates.name !== undefined) setFields.name = updates.name;
  if (updates.macAddress !== undefined) setFields.macAddress = updates.macAddress;
  if (updates.ipAddress !== undefined) setFields.ipAddress = updates.ipAddress || null;
  db.update(wolDevices).set(setFields).where(eq(wolDevices.id, id)).run();
}

export function deleteWolDevice(id: string): void {
  db.delete(wolDevices).where(eq(wolDevices.id, id)).run();
}

export async function wakeDevice(id: string): Promise<void> {
  const device = db.select().from(wolDevices).where(eq(wolDevices.id, id)).get();
  if (!device) throw new Error("Device not found");

  await sendMagicPacket(device.macAddress);

  db.update(wolDevices)
    .set({ lastWake: new Date().toISOString() })
    .where(eq(wolDevices.id, id))
    .run();
}

export async function getDevicesWithStatus(): Promise<WolDevice[]> {
  const allDevices = getWolDevices();

  const results = await Promise.all(
    allDevices.map(async (device) => {
      let online = false;
      if (device.ipAddress) {
        online = await pingHost(device.ipAddress);
      }
      return { ...device, online };
    })
  );

  return results;
}
