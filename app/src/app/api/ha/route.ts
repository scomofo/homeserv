import { NextRequest } from "next/server";
import { getHAStates, callHAService, testHAConnection, isHAConfigured } from "@/lib/ha-client";

export async function GET() {
  try {
    if (!isHAConfigured()) {
      return Response.json({ configured: false, entities: [] });
    }

    const entities = await getHAStates();

    // Filter to useful device types
    const deviceEntities = entities.filter((e) => {
      const domain = e.entity_id.split(".")[0];
      return [
        "light", "switch", "sensor", "binary_sensor", "climate",
        "lock", "cover", "fan", "media_player", "vacuum",
      ].includes(domain);
    });

    return Response.json({ configured: true, entities: deviceEntities });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "HA connection failed" },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, entity_id, data } = await request.json();

    if (action === "test") {
      const result = await testHAConnection();
      return Response.json(result);
    }

    if (!entity_id) {
      return Response.json({ error: "entity_id required" }, { status: 400 });
    }

    const domain = entity_id.split(".")[0];

    // Map common actions to HA services
    let service: string;
    let serviceData: Record<string, unknown> = { entity_id, ...data };

    switch (action) {
      case "toggle":
        service = "toggle";
        break;
      case "turn_on":
        service = "turn_on";
        break;
      case "turn_off":
        service = "turn_off";
        break;
      case "set_brightness":
        service = "turn_on";
        serviceData.brightness_pct = data?.brightness;
        break;
      case "set_temperature":
        service = "set_temperature";
        serviceData.temperature = data?.temperature;
        break;
      case "lock":
        service = "lock";
        break;
      case "unlock":
        service = "unlock";
        break;
      default:
        service = action;
    }

    const result = await callHAService(domain, service, serviceData);
    return Response.json({ success: true, result });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "HA service call failed" },
      { status: 502 }
    );
  }
}
