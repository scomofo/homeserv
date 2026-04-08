"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Server, Check, ChevronRight, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProps {
  active: boolean;
  done: boolean;
  label: string;
}

function StepDot({ active, done, label }: StepProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
          done
            ? "bg-emerald-500 text-white"
            : active
            ? "bg-blue-500 text-white"
            : "bg-slate-200 dark:bg-slate-700 text-slate-400"
        )}
      >
        {done ? <Check className="w-3.5 h-3.5" /> : null}
      </div>
      <span className={cn("text-sm", active ? "text-slate-800 dark:text-slate-100 font-medium" : "text-slate-400")}>{label}</span>
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  function update(key: string, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function saveSettings(keys: string[]) {
    setSaving(true);
    const payload: Record<string, string> = {};
    for (const k of keys) {
      if (settings[k] !== undefined) payload[k] = settings[k];
    }
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
  }

  async function testHA() {
    setTestResult(null);
    try {
      const res = await fetch("/api/ha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json();
      setTestResult(data.ok ? `Connected (v${data.version})` : data.error || "Failed");
    } catch {
      setTestResult("Connection failed");
    }
  }

  async function testMQTT() {
    setTestResult(null);
    try {
      const res = await fetch("/api/mqtt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json();
      setTestResult(data.connected ? "Connected" : data.error || "Failed");
    } catch {
      setTestResult("Connection failed");
    }
  }

  function finish() {
    // Mark onboarding as done
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboarding_complete: "true" }),
    }).then(() => router.push("/"));
  }

  const steps = ["General", "Home Assistant", "MQTT", "Files", "Done"];

  return (
    <div className="min-h-screen warm-gradient flex items-center justify-center p-4">
      <div className="warm-card p-8 w-full max-w-lg animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-lg mb-3">
            <Server className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Welcome to HomeServ</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Let&apos;s get your server set up</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {steps.map((label, i) => (
            <StepDot key={label} label={label} active={i === step} done={i < step} />
          ))}
        </div>

        {/* Step content */}
        <div className="space-y-4 mb-6">
          {step === 0 && (
            <>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Server Name</label>
              <input
                type="text"
                placeholder="My Home Server"
                value={settings.server_name || ""}
                onChange={(e) => update("server_name", e.target.value)}
                className={inputClass}
              />
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-xs text-slate-400 mb-2">Optional — connect your Home Assistant instance.</p>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">HA URL</label>
              <input
                type="text"
                placeholder="http://homeassistant.local:8123"
                value={settings.ha_url || ""}
                onChange={(e) => update("ha_url", e.target.value)}
                className={inputClass}
              />
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 mt-3">Long-Lived Access Token</label>
              <input
                type="password"
                placeholder="eyJ..."
                value={settings.ha_token === "********" ? "" : settings.ha_token || ""}
                onChange={(e) => update("ha_token", e.target.value)}
                className={inputClass}
              />
              {settings.ha_url && settings.ha_token && settings.ha_token !== "********" && (
                <button
                  onClick={async () => { await saveSettings(["ha_url", "ha_token"]); testHA(); }}
                  className="text-xs text-blue-500 hover:text-blue-400 underline mt-1"
                >
                  Test connection
                </button>
              )}
              {testResult && <p className="text-xs text-slate-500 mt-1">{testResult}</p>}
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-xs text-slate-400 mb-2">Optional — connect an MQTT broker.</p>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Broker URL</label>
              <input
                type="text"
                placeholder="mqtt://localhost:1883"
                value={settings.mqtt_broker_url || ""}
                onChange={(e) => update("mqtt_broker_url", e.target.value)}
                className={inputClass}
              />
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 mt-3">Username (optional)</label>
              <input
                type="text"
                value={settings.mqtt_username || ""}
                onChange={(e) => update("mqtt_username", e.target.value)}
                className={inputClass}
              />
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 mt-3">Password (optional)</label>
              <input
                type="password"
                value={settings.mqtt_password === "********" ? "" : settings.mqtt_password || ""}
                onChange={(e) => update("mqtt_password", e.target.value)}
                className={inputClass}
              />
              {settings.mqtt_broker_url && (
                <button
                  onClick={async () => { await saveSettings(["mqtt_broker_url", "mqtt_username", "mqtt_password"]); testMQTT(); }}
                  className="text-xs text-blue-500 hover:text-blue-400 underline mt-1"
                >
                  Test connection
                </button>
              )}
              {testResult && <p className="text-xs text-slate-500 mt-1">{testResult}</p>}
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-xs text-slate-400 mb-2">Optional — set directories for the file manager and media player.</p>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">File Roots (JSON array)</label>
              <input
                type="text"
                placeholder='["/home/user/files"]'
                value={settings.file_roots || ""}
                onChange={(e) => update("file_roots", e.target.value)}
                className={inputClass}
              />
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 mt-3">Media Roots (JSON array)</label>
              <input
                type="text"
                placeholder='["/home/user/media"]'
                value={settings.media_roots || ""}
                onChange={(e) => update("media_roots", e.target.value)}
                className={inputClass}
              />
            </>
          )}

          {step === 4 && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">You&apos;re all set!</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You can always change these in Settings. Check the dashboard for next steps.
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {step < 4 ? (
            <>
              <button
                onClick={() => { setTestResult(null); setStep((s) => Math.max(0, s - 1)); }}
                disabled={step === 0}
                className="text-sm text-slate-400 hover:text-slate-600 disabled:opacity-30"
              >
                Back
              </button>
              <div className="flex items-center gap-2">
                {step > 0 && step < 4 && (
                  <button
                    onClick={() => { setTestResult(null); setStep((s) => s + 1); }}
                    className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
                  >
                    <SkipForward className="w-3.5 h-3.5" /> Skip
                  </button>
                )}
                <button
                  onClick={async () => {
                    if (step === 0) await saveSettings(["server_name"]);
                    if (step === 1) await saveSettings(["ha_url", "ha_token"]);
                    if (step === 2) await saveSettings(["mqtt_broker_url", "mqtt_username", "mqtt_password"]);
                    if (step === 3) await saveSettings(["file_roots", "media_roots"]);
                    setTestResult(null);
                    setStep((s) => s + 1);
                  }}
                  disabled={saving}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold shadow-md hover:shadow-lg transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Next"} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={finish}
              className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-md hover:shadow-lg transition"
            >
              Go to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
