"use client";

interface DiskInfo {
  fs: string;
  size: number;
  used: number;
  mount: string;
  percent: number;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${(bytes / 1e6).toFixed(0)} MB`;
}

export function DiskChart({ disks }: { disks: DiskInfo[] }) {
  return (
    <div className="warm-card p-6">
      <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-4">
        Disk Usage
      </h3>

      <div className="space-y-4">
        {disks.map((disk, i) => (
          <div key={i}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
                {disk.mount}
              </span>
              <span className="text-slate-500 dark:text-slate-400 ml-2 shrink-0">
                {formatBytes(disk.used)} / {formatBytes(disk.size)}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  disk.percent > 90
                    ? "bg-red-500"
                    : disk.percent > 70
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${disk.percent}%` }}
              />
            </div>
            <div className="text-right text-xs text-slate-400 mt-0.5">
              {disk.percent.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
