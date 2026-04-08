"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Plus,
  Trash2,
  Pencil,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import { triggerSummary, actionSummary } from "@/lib/automation-summaries";
import type {
  Automation,
  TriggerType,
  ActionType,
  MqttMessageTriggerConfig,
  HaStateTriggerConfig,
  ScheduleTriggerConfig,
  MqttPublishActionConfig,
  HaServiceActionConfig,
  WolWakeActionConfig,
} from "@/lib/automation-types";

const TRIGGER_TYPES: { value: TriggerType; label: string }[] = [
  { value: "mqtt_message", label: "MQTT Message" },
  { value: "ha_state", label: "Home Assistant State" },
  { value: "schedule", label: "Schedule" },
];

const ACTION_TYPES: { value: ActionType; label: string }[] = [
  { value: "mqtt_publish", label: "MQTT Publish" },
  { value: "ha_service", label: "Home Assistant Service" },
  { value: "wol_wake", label: "Wake-on-LAN" },
];

const inputClass =
  "px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-full";

const selectClass =
  "px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 w-full";

interface FormState {
  name: string;
  enabled: boolean;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  actionType: ActionType;
  actionConfig: Record<string, unknown>;
}

function emptyTriggerConfig(type: TriggerType): Record<string, unknown> {
  switch (type) {
    case "mqtt_message":
      return { topic: "", matchType: "equals", value: "" };
    case "ha_state":
      return { entityId: "", matchType: "equals", value: "" };
    case "schedule":
      return { mode: "daily", time: "00:00" };
  }
}

function emptyActionConfig(type: ActionType): Record<string, unknown> {
  switch (type) {
    case "mqtt_publish":
      return { topic: "", message: "" };
    case "ha_service":
      return { domain: "", service: "", data: {} };
    case "wol_wake":
      return { deviceId: "" };
  }
}

function defaultForm(): FormState {
  return {
    name: "",
    enabled: true,
    triggerType: "mqtt_message",
    triggerConfig: emptyTriggerConfig("mqtt_message"),
    actionType: "mqtt_publish",
    actionConfig: emptyActionConfig("mqtt_publish"),
  };
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [haDataText, setHaDataText] = useState("");

  const fetchAutomations = useCallback(async () => {
    try {
      const res = await fetch("/api/automations");
      if (res.ok) {
        setAutomations(await res.json());
        setLoadError(null);
      } else {
        setLoadError(`Failed to load automations (${res.status})`);
      }
    } catch {
      setLoadError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAutomations();
    const interval = setInterval(fetchAutomations, 15_000);
    return () => clearInterval(interval);
  }, [fetchAutomations]);

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm());
    setHaDataText("");
    setError(null);
    setShowForm(true);
  }

  function openEdit(auto: Automation) {
    setEditingId(auto.id);
    const ac = auto.actionConfig as unknown as Record<string, unknown>;
    setForm({
      name: auto.name,
      enabled: auto.enabled,
      triggerType: auto.triggerType,
      triggerConfig: auto.triggerConfig as unknown as Record<string, unknown>,
      actionType: auto.actionType,
      actionConfig: ac,
    });
    // Initialize raw JSON text for HA service data field
    if (auto.actionType === "ha_service" && ac.data && typeof ac.data === "object") {
      setHaDataText(JSON.stringify(ac.data, null, 2));
    } else {
      setHaDataText("");
    }
    setError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    // Parse HA service data JSON before save
    let actionConfig = form.actionConfig;
    if (form.actionType === "ha_service" && haDataText.trim()) {
      try {
        const parsed = JSON.parse(haDataText);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          setError("Data must be a JSON object (e.g. {\"entity_id\": \"light.x\"})");
          setSaving(false);
          return;
        }
        actionConfig = { ...actionConfig, data: parsed };
      } catch {
        setError("Invalid JSON in Data field — check syntax");
        setSaving(false);
        return;
      }
    } else if (form.actionType === "ha_service") {
      actionConfig = { ...actionConfig, data: {} };
    }

    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name,
        enabled: form.enabled,
        triggerType: form.triggerType,
        triggerConfig: form.triggerConfig,
        actionType: form.actionType,
        actionConfig,
      };

      const res = await fetch("/api/automations", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }

      closeForm();
      fetchAutomations();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(auto: Automation) {
    await fetch("/api/automations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: auto.id, enabled: !auto.enabled }),
    });
    fetchAutomations();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this automation?")) return;
    await fetch("/api/automations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchAutomations();
  }

  function updateTriggerConfig(key: string, value: unknown) {
    setForm((f) => ({ ...f, triggerConfig: { ...f.triggerConfig, [key]: value } }));
  }

  function updateActionConfig(key: string, value: unknown) {
    setForm((f) => ({ ...f, actionConfig: { ...f.actionConfig, [key]: value } }));
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Automations
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Simple rules for your server and smart home
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAutomations}
            className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition"
          >
            <Plus className="w-4 h-4" /> New Automation
          </button>
        </div>
      </div>

      {showForm && (
        <div className="warm-card p-5 mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {editingId ? "Edit Automation" : "New Automation"}
            </h3>
            <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="e.g. Turn off living room lights at night"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Trigger Type
              </label>
              <select
                value={form.triggerType}
                onChange={(e) => {
                  const type = e.target.value as TriggerType;
                  setForm((f) => ({ ...f, triggerType: type, triggerConfig: emptyTriggerConfig(type) }));
                }}
                className={selectClass}
              >
                {TRIGGER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <TriggerConfigFields
              type={form.triggerType}
              config={form.triggerConfig}
              onChange={updateTriggerConfig}
            />

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Action Type
              </label>
              <select
                value={form.actionType}
                onChange={(e) => {
                  const type = e.target.value as ActionType;
                  setForm((f) => ({ ...f, actionType: type, actionConfig: emptyActionConfig(type) }));
                }}
                className={selectClass}
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <ActionConfigFields
              type={form.actionType}
              config={form.actionConfig}
              onChange={updateActionConfig}
              haDataText={haDataText}
              onHaDataTextChange={setHaDataText}
            />

            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
              />
              Enabled
            </label>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !form.name}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold shadow-md hover:shadow-lg transition disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Update Automation" : "Create Automation"}
            </button>
          </div>
        </div>
      )}

      {loadError && (
        <div className="warm-card p-4 mb-4 flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{loadError}</span>
          <button
            onClick={fetchAutomations}
            className="ml-auto text-xs text-blue-500 hover:text-blue-400 underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : automations.length === 0 && !loadError ? (
        <div className="warm-card p-8 text-center">
          <Zap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">
            No automations yet. Click &quot;New Automation&quot; to create one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((auto) => (
            <div
              key={auto.id}
              className={cn(
                "warm-card p-4 transition-opacity",
                !auto.enabled && "opacity-50"
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleToggle(auto)}
                  className={cn(
                    "mt-1 w-8 h-5 rounded-full relative transition-colors shrink-0",
                    auto.enabled ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                      auto.enabled ? "left-3.5" : "left-0.5"
                    )}
                  />
                </button>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {auto.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {triggerSummary(auto.triggerType, auto.triggerConfig)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    &rarr; {actionSummary(auto.actionType, auto.actionConfig)}
                  </p>

                  {auto.lastResult && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {auto.lastResult === "success" ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      )}
                      <span
                        className={cn(
                          "text-xs",
                          auto.lastResult === "success"
                            ? "text-emerald-500"
                            : "text-red-500"
                        )}
                      >
                        {auto.lastResult === "success" ? "Last run succeeded" : auto.lastError || "Last run failed"}
                      </span>
                      {auto.lastRunAt && (
                        <span className="text-xs text-slate-400 ml-1">
                          &middot; {new Date(auto.lastRunAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(auto)}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-500 transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(auto.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TriggerConfigFields({
  type,
  config,
  onChange,
}: {
  type: TriggerType;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  switch (type) {
    case "mqtt_message": {
      const c = config as unknown as MqttMessageTriggerConfig;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="MQTT Topic"
            value={c.topic || ""}
            onChange={(e) => onChange("topic", e.target.value)}
            className={inputClass}
          />
          <select
            value={c.matchType || "equals"}
            onChange={(e) => onChange("matchType", e.target.value)}
            className={selectClass}
          >
            <option value="equals">Equals</option>
            <option value="contains">Contains</option>
            <option value="exists">Any Message</option>
          </select>
          {c.matchType !== "exists" && (
            <input
              type="text"
              placeholder="Match Value"
              value={c.value || ""}
              onChange={(e) => onChange("value", e.target.value)}
              className={inputClass}
            />
          )}
        </div>
      );
    }
    case "ha_state": {
      const c = config as unknown as HaStateTriggerConfig;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Entity ID (e.g. light.living_room)"
            value={c.entityId || ""}
            onChange={(e) => onChange("entityId", e.target.value)}
            className={inputClass}
          />
          <select
            value={c.matchType || "equals"}
            onChange={(e) => onChange("matchType", e.target.value)}
            className={selectClass}
          >
            <option value="equals">Equals</option>
            <option value="contains">Contains</option>
            <option value="exists">Any State</option>
          </select>
          {c.matchType !== "exists" && (
            <input
              type="text"
              placeholder="Match Value (e.g. on)"
              value={c.value || ""}
              onChange={(e) => onChange("value", e.target.value)}
              className={inputClass}
            />
          )}
        </div>
      );
    }
    case "schedule": {
      const c = config as unknown as ScheduleTriggerConfig;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={c.mode || "daily"}
            onChange={(e) => {
              const mode = e.target.value as "daily" | "hourly";
              if (mode === "daily") {
                onChange("mode", "daily");
                onChange("time", "00:00");
                onChange("minute", undefined);
              } else {
                onChange("mode", "hourly");
                onChange("minute", 0);
                onChange("time", undefined);
              }
            }}
            className={selectClass}
          >
            <option value="daily">Daily</option>
            <option value="hourly">Hourly</option>
          </select>
          {c.mode === "hourly" ? (
            <input
              type="number"
              placeholder="Minute (0-59)"
              min={0}
              max={59}
              value={c.minute ?? 0}
              onChange={(e) => onChange("minute", parseInt(e.target.value) || 0)}
              className={inputClass}
            />
          ) : (
            <input
              type="time"
              value={c.time || "00:00"}
              onChange={(e) => onChange("time", e.target.value)}
              className={inputClass}
            />
          )}
        </div>
      );
    }
  }
}

function ActionConfigFields({
  type,
  config,
  onChange,
  haDataText,
  onHaDataTextChange,
}: {
  type: ActionType;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  haDataText: string;
  onHaDataTextChange: (text: string) => void;
}) {
  switch (type) {
    case "mqtt_publish": {
      const c = config as unknown as MqttPublishActionConfig;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="MQTT Topic"
            value={c.topic || ""}
            onChange={(e) => onChange("topic", e.target.value)}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Message"
            value={c.message || ""}
            onChange={(e) => onChange("message", e.target.value)}
            className={inputClass}
          />
        </div>
      );
    }
    case "ha_service": {
      const c = config as unknown as HaServiceActionConfig;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Domain (e.g. light)"
            value={c.domain || ""}
            onChange={(e) => onChange("domain", e.target.value)}
            className={inputClass}
          />
          <input
            type="text"
            placeholder="Service (e.g. turn_off)"
            value={c.service || ""}
            onChange={(e) => onChange("service", e.target.value)}
            className={inputClass}
          />
          <input
            type="text"
            placeholder='Data JSON (e.g. {"entity_id":"light.x"})'
            value={haDataText}
            onChange={(e) => onHaDataTextChange(e.target.value)}
            className={inputClass}
          />
        </div>
      );
    }
    case "wol_wake": {
      const c = config as unknown as WolWakeActionConfig;
      return (
        <div>
          <input
            type="text"
            placeholder="WOL Device ID"
            value={c.deviceId || ""}
            onChange={(e) => onChange("deviceId", e.target.value)}
            className={inputClass}
          />
        </div>
      );
    }
  }
}
