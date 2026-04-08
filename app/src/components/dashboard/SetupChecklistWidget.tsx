"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface CheckItem {
  label: string;
  done: boolean;
  href: string;
}

export function SetupChecklistWidget() {
  const [items, setItems] = useState<CheckItem[] | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => {
        // If onboarding marked complete and all items done, hide
        const checks: CheckItem[] = [
          { label: "Connect Home Assistant", done: !!s.ha_url, href: "/settings" },
          { label: "Connect MQTT broker", done: !!s.mqtt_broker_url, href: "/settings" },
          { label: "Configure file paths", done: !!s.file_roots, href: "/settings" },
          { label: "Create first automation", done: false, href: "/automations" },
        ];

        // Check if automations exist
        fetch("/api/automations")
          .then((r) => r.json())
          .then((autos) => {
            if (Array.isArray(autos) && autos.length > 0) {
              checks[3].done = true;
            }
            const allDone = checks.every((c) => c.done);
            if (s.onboarding_complete === "true" && allDone) {
              setHidden(true);
            }
            setItems(checks);
          })
          .catch(() => setItems(checks));
      })
      .catch(() => {});
  }, []);

  if (hidden || !items) return null;

  const doneCount = items.filter((i) => i.done).length;
  if (doneCount === items.length) return null;

  return (
    <div className="warm-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Getting Started
        </h3>
        <span className="text-xs text-slate-400">{doneCount}/{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-2 text-sm group"
          >
            {item.done ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
            )}
            <span className={item.done ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-300"}>
              {item.label}
            </span>
            {!item.done && (
              <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500 ml-auto transition" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
