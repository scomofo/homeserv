import { getSetting } from "./settings";

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

export interface HAConfig {
  location_name: string;
  latitude: number;
  longitude: number;
  version: string;
}

function getClient(): { baseUrl: string; token: string } | null {
  const baseUrl = getSetting("ha_url");
  const token = getSetting("ha_token");
  if (!baseUrl || !token) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), token };
}

async function haFetch(path: string, options?: RequestInit): Promise<Response> {
  const client = getClient();
  if (!client) throw new Error("Home Assistant not configured");

  return fetch(`${client.baseUrl}/api${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${client.token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
}

export async function getHAStates(): Promise<HAEntity[]> {
  const res = await haFetch("/states");
  if (!res.ok) throw new Error(`HA API error: ${res.status}`);
  return res.json();
}

export async function getHAState(entityId: string): Promise<HAEntity> {
  const res = await haFetch(`/states/${entityId}`);
  if (!res.ok) throw new Error(`HA API error: ${res.status}`);
  return res.json();
}

export async function callHAService(
  domain: string,
  service: string,
  data?: Record<string, unknown>
): Promise<unknown> {
  const res = await haFetch(`/services/${domain}/${service}`, {
    method: "POST",
    body: JSON.stringify(data || {}),
  });
  if (!res.ok) throw new Error(`HA API error: ${res.status}`);
  return res.json();
}

export async function getHAConfig(): Promise<HAConfig> {
  const res = await haFetch("/config");
  if (!res.ok) throw new Error(`HA API error: ${res.status}`);
  return res.json();
}

export async function testHAConnection(): Promise<{ ok: boolean; version?: string; error?: string }> {
  try {
    const config = await getHAConfig();
    return { ok: true, version: config.version };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export function isHAConfigured(): boolean {
  return getClient() !== null;
}
