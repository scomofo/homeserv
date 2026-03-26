import { NextRequest } from "next/server";
import {
  connectMqtt,
  disconnectMqtt,
  getMqttStatus,
  getSubscribedTopics,
  publish,
  subscribe,
  isMqttConfigured,
} from "@/lib/mqtt-client";

export async function GET() {
  try {
    if (!isMqttConfigured()) {
      return Response.json({ configured: false, connected: false, topics: [] });
    }

    // Auto-connect if configured but not connected
    connectMqtt();

    const status = getMqttStatus();
    const topics = getSubscribedTopics();

    return Response.json({
      configured: true,
      connected: status.connected,
      broker: status.broker,
      topics,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "MQTT error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, topic, message } = await request.json();

    switch (action) {
      case "connect":
        connectMqtt();
        return Response.json({ success: true, status: getMqttStatus() });

      case "disconnect":
        disconnectMqtt();
        return Response.json({ success: true });

      case "subscribe":
        if (!topic) return Response.json({ error: "topic required" }, { status: 400 });
        subscribe(topic);
        return Response.json({ success: true });

      case "unsubscribe":
        // Unsubscribe handled by cleanup function returned from subscribe
        return Response.json({ success: true });

      case "publish":
        if (!topic || message === undefined) {
          return Response.json({ error: "topic and message required" }, { status: 400 });
        }
        publish(topic, String(message));
        return Response.json({ success: true });

      case "test":
        connectMqtt();
        // Wait a moment for connection
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const status = getMqttStatus();
        return Response.json({ ok: status.connected, broker: status.broker });

      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "MQTT error" },
      { status: 500 }
    );
  }
}
