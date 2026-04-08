import mqtt from "mqtt";
import { getSetting } from "./settings";

let client: mqtt.MqttClient | null = null;
let connected = false;

type MessageCallback = (topic: string, message: string) => void;
const subscriptions = new Map<string, Set<MessageCallback>>();
const latestValues = new Map<string, string>();

export function getMqttStatus(): { connected: boolean; broker: string | null } {
  return {
    connected,
    broker: getSetting("mqtt_broker_url") || null,
  };
}

export function connectMqtt(): boolean {
  const brokerUrl = getSetting("mqtt_broker_url");
  if (!brokerUrl) return false;

  // Already connected to this broker
  if (client && connected) return true;

  // Disconnect existing client
  if (client) {
    try { client.end(true); } catch { /* ignore */ }
    client = null;
    connected = false;
  }

  const username = getSetting("mqtt_username");
  const password = getSetting("mqtt_password");

  const options: mqtt.IClientOptions = {
    reconnectPeriod: 5000,
    connectTimeout: 10000,
  };

  if (username) options.username = username;
  if (password) options.password = password;

  client = mqtt.connect(brokerUrl, options);

  client.on("connect", () => {
    connected = true;
    // Resubscribe to all topics
    for (const topic of subscriptions.keys()) {
      client?.subscribe(topic);
    }
  });

  client.on("close", () => {
    connected = false;
  });

  client.on("error", () => {
    connected = false;
  });

  client.on("message", (topic: string, payload: Buffer) => {
    const message = payload.toString();
    latestValues.set(topic, message);

    const callbacks = subscriptions.get(topic);
    if (callbacks) {
      for (const cb of callbacks) {
        try { cb(topic, message); } catch { /* ignore callback errors */ }
      }
    }

    // Also check wildcard subscriptions
    for (const [pattern, cbs] of subscriptions.entries()) {
      if (pattern.includes("#") || pattern.includes("+")) {
        if (topicMatchesPattern(topic, pattern)) {
          for (const cb of cbs) {
            try { cb(topic, message); } catch { /* ignore */ }
          }
        }
      }
    }
  });

  return true;
}

function topicMatchesPattern(topic: string, pattern: string): boolean {
  const topicParts = topic.split("/");
  const patternParts = pattern.split("/");

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i] === "#") {
      // '#' is only valid as the last segment per MQTT spec
      return i === patternParts.length - 1;
    }
    if (patternParts[i] === "+") continue;
    if (i >= topicParts.length || patternParts[i] !== topicParts[i]) return false;
  }

  return topicParts.length === patternParts.length;
}

export function subscribe(topic: string, callback?: MessageCallback): () => void {
  if (!subscriptions.has(topic)) {
    subscriptions.set(topic, new Set());
    client?.subscribe(topic);
  }

  if (callback) {
    subscriptions.get(topic)!.add(callback);
  }

  return () => {
    if (callback) {
      subscriptions.get(topic)?.delete(callback);
    }
    if (subscriptions.get(topic)?.size === 0) {
      subscriptions.delete(topic);
      client?.unsubscribe(topic);
    }
  };
}

export function publish(topic: string, message: string): void {
  if (!client || !connected) throw new Error("MQTT not connected");
  client.publish(topic, message);
}

export function getSubscribedTopics(): { topic: string; value: string | null }[] {
  const topics: { topic: string; value: string | null }[] = [];
  for (const topic of subscriptions.keys()) {
    topics.push({ topic, value: latestValues.get(topic) ?? null });
  }
  return topics;
}

export function getLatestValue(topic: string): string | null {
  return latestValues.get(topic) ?? null;
}

export function disconnectMqtt(): void {
  if (client) {
    try { client.end(true); } catch { /* ignore */ }
    client = null;
    connected = false;
  }
}

export function isMqttConfigured(): boolean {
  return !!getSetting("mqtt_broker_url");
}
