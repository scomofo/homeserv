import { NextRequest } from "next/server";
import { getSystemSnapshot, startMetricCollector, getMetricHistory } from "@/lib/system-monitor";

export async function GET(request: NextRequest) {
  // Start background collector on first API call
  startMetricCollector();

  const { searchParams } = new URL(request.url);
  const history = searchParams.get("history");

  if (history) {
    const hours = parseInt(history, 10);
    if (isNaN(hours) || hours < 1 || hours > 24) {
      return Response.json({ error: "history must be 1-24" }, { status: 400 });
    }
    const data = getMetricHistory(hours);
    return Response.json(data);
  }

  const snapshot = await getSystemSnapshot();
  return Response.json(snapshot);
}
