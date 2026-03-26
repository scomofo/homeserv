"use client";

import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Home,
  Radio,
  FolderOpen,
  Film,
  Monitor,
  Shield,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "ha", label: "Home Assistant", icon: Home },
  { id: "mqtt", label: "MQTT", icon: Radio },
  { id: "files", label: "File Manager", icon: FolderOpen },
  { id: "media", label: "Media", icon: Film },
  { id: "vnc", label: "VNC", icon: Monitor },
  { id: "security", label: "Security", icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});
  }, []);

  function updateSetting(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // Ignore
    } finally {
      setSaving(false);
    }
  }

  async function testConnection(type: "ha" | "mqtt") {
    setTestResult(null);
    // Save first so the server has the latest config
    await saveSettings();

    try {
      const res = await fetch(`/api/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test" }),
      });
      const data = await res.json();
      setTestResult({
        ok: data.ok,
        message: data.ok
          ? type === "ha"
            ? `Connected! HA v${data.version}`
            : `Connected to ${data.broker}`
          : data.error || "Connection failed",
      });
    } catch {
      setTestResult({ ok: false, message: "Connection failed" });
    }
  }

  function SettingField({
    label,
    settingKey,
    type = "text",
    placeholder,
    help,
  }: {
    label: string;
    settingKey: string;
    type?: string;
    placeholder?: string;
    help?: string;
  }) {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
          {label}
        </label>
        <input
          type={type}
          value={settings[settingKey] || ""}
          onChange={(e) => updateSetting(settingKey, e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
        />
        {help && <p className="text-xs text-slate-400 mt-1">{help}</p>}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-6 h-6 text-slate-500" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
      </div>

      <div className="flex gap-6">
        {/* Tab sidebar */}
        <nav className="w-48 shrink-0">
          <div className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setTestResult(null); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition",
                    activeTab === tab.id
                      ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Tab content */}
        <div className="flex-1">
          <div className="warm-card p-6 space-y-5">
            {activeTab === "general" && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">General</h2>
                <p className="text-sm text-slate-500">General server settings and preferences.</p>
                <SettingField label="Server Name" settingKey="server_name" placeholder="HomeServ" />
              </>
            )}

            {activeTab === "ha" && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Home Assistant</h2>
                <p className="text-sm text-slate-500">Connect to your Home Assistant instance.</p>
                <SettingField
                  label="Home Assistant URL"
                  settingKey="ha_url"
                  placeholder="http://homeassistant.local:8123"
                  help="The base URL of your Home Assistant server"
                />
                <SettingField
                  label="Long-Lived Access Token"
                  settingKey="ha_token"
                  type="password"
                  placeholder="eyJhbGciOiJI..."
                  help="Generate in HA: Profile > Long-Lived Access Tokens > Create Token"
                />
                <button
                  onClick={() => testConnection("ha")}
                  className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition"
                >
                  Test Connection
                </button>
              </>
            )}

            {activeTab === "mqtt" && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">MQTT</h2>
                <p className="text-sm text-slate-500">Connect to an MQTT broker for IoT device communication.</p>
                <SettingField
                  label="Broker URL"
                  settingKey="mqtt_broker_url"
                  placeholder="mqtt://192.168.1.100:1883"
                  help="URL of your MQTT broker (mqtt:// or mqtts://)"
                />
                <SettingField
                  label="Username"
                  settingKey="mqtt_username"
                  placeholder="Optional"
                />
                <SettingField
                  label="Password"
                  settingKey="mqtt_password"
                  type="password"
                  placeholder="Optional"
                />
                <button
                  onClick={() => testConnection("mqtt")}
                  className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition"
                >
                  Test Connection
                </button>
              </>
            )}

            {activeTab === "files" && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">File Manager</h2>
                <p className="text-sm text-slate-500">Configure which directories can be browsed.</p>
                <SettingField
                  label="Allowed Root Paths"
                  settingKey="file_roots"
                  placeholder='["C:/Users/Scott/Documents", "D:/Shared"]'
                  help="JSON array of absolute directory paths that can be browsed"
                />
              </>
            )}

            {activeTab === "media" && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Media Server</h2>
                <p className="text-sm text-slate-500">Configure media library directories.</p>
                <SettingField
                  label="Media Root Paths"
                  settingKey="media_roots"
                  placeholder='["D:/Movies", "D:/Music"]'
                  help="JSON array of directories containing media files"
                />
                <SettingField
                  label="FFmpeg Path"
                  settingKey="ffmpeg_path"
                  placeholder="ffmpeg"
                  help="Path to ffmpeg binary for thumbnail generation (default: ffmpeg in PATH)"
                />
              </>
            )}

            {activeTab === "vnc" && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Remote Desktop (VNC)</h2>
                <p className="text-sm text-slate-500">Configure VNC server connection for remote desktop access.</p>
                <SettingField
                  label="VNC Host"
                  settingKey="vnc_host"
                  placeholder="localhost"
                  help="Hostname of the VNC server"
                />
                <SettingField
                  label="VNC Port"
                  settingKey="vnc_port"
                  placeholder="5900"
                  help="Port of the VNC server"
                />
                <SettingField
                  label="VNC Password"
                  settingKey="vnc_password"
                  type="password"
                  placeholder="Optional"
                />
              </>
            )}

            {activeTab === "security" && (
              <>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Security</h2>
                <p className="text-sm text-slate-500">Session and access settings.</p>
                <SettingField
                  label="Session Timeout (hours)"
                  settingKey="session_timeout_hours"
                  placeholder="72"
                  help="How long sessions remain valid"
                />
                <div className="warm-card p-4 bg-slate-50 dark:bg-slate-800/50">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">HTTPS Setup</h3>
                  <p className="text-xs text-slate-500">
                    For secure remote access, set up a reverse proxy (nginx/Caddy) with SSL
                    in front of HomeServ, or use a Cloudflare Tunnel.
                  </p>
                </div>
              </>
            )}

            {/* Test result */}
            {testResult && (
              <div
                className={cn(
                  "flex items-center gap-2 p-3 rounded-xl text-sm",
                  testResult.ok
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                )}
              >
                {testResult.ok ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {testResult.message}
              </div>
            )}

            {/* Save button */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  "Save Settings"
                )}
              </button>
              {saved && (
                <span className="text-sm text-emerald-500 flex items-center gap-1 animate-fade-in">
                  <Check className="w-4 h-4" /> Saved
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
