"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Film,
  Music,
  Image,
  FolderOpen,
  ChevronRight,
  ArrowLeft,
  Play,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

interface MediaItem {
  name: string;
  path: string;
  isDirectory: boolean;
  type: "video" | "audio" | "image" | "other";
  size: number;
  modified: string;
  extension: string;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(1)} KB`;
}

function getTypeIcon(type: string) {
  switch (type) {
    case "video": return Film;
    case "audio": return Music;
    case "image": return Image;
    default: return FolderOpen;
  }
}

export default function MediaPage() {
  const [roots, setRoots] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<MediaItem | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const loadDirectory = useCallback(async (dirPath: string | null) => {
    setLoading(true);
    try {
      const url = dirPath
        ? `/api/media?path=${encodeURIComponent(dirPath)}`
        : "/api/media";
      const res = await fetch(url);
      const data = await res.json();

      if (data.roots) {
        setRoots(data.roots);
        setCurrentPath(null);
        setItems([]);
      } else {
        setCurrentPath(dirPath);
        setItems(data.items || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory(null);
  }, [loadDirectory]);

  function navigateUp() {
    if (!currentPath) return;
    const parts = currentPath.replace(/\\/g, "/").split("/");
    parts.pop();
    const parent = parts.join("/");
    const isRoot = roots.some((r) => r.replace(/\\/g, "/") === currentPath.replace(/\\/g, "/"));
    if (isRoot) {
      loadDirectory(null);
    } else {
      loadDirectory(parent);
    }
  }

  function playMedia(item: MediaItem) {
    setPlaying(item);
  }

  const breadcrumbs = currentPath
    ? currentPath.replace(/\\/g, "/").split("/").filter(Boolean)
    : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Film className="w-6 h-6 text-purple-500" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Media</h1>
      </div>

      {/* Breadcrumb */}
      <div className="warm-card p-3 mb-4 flex items-center gap-2">
        <button
          onClick={() => loadDirectory(null)}
          className="text-blue-500 hover:text-blue-600 text-sm shrink-0"
        >
          Root
        </button>
        {breadcrumbs.map((part, i) => {
          const fullPath = breadcrumbs.slice(0, i + 1).join("/");
          return (
            <span key={i} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <button
                onClick={() => loadDirectory(fullPath)}
                className="text-blue-500 hover:text-blue-600 text-sm"
              >
                {part}
              </button>
            </span>
          );
        })}
        {currentPath && (
          <button
            onClick={navigateUp}
            className="ml-auto p-1 rounded text-slate-400 hover:text-blue-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Media player */}
      {playing && (
        <div className="warm-card p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
              {playing.name}
            </h3>
            <button
              onClick={() => setPlaying(null)}
              className="p-1 rounded text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {playing.type === "video" ? (
            <video
              ref={videoRef}
              src={`/api/media?path=${encodeURIComponent(playing.path)}&stream=1`}
              controls
              autoPlay
              className="w-full max-h-[60vh] rounded-lg bg-black"
            />
          ) : playing.type === "audio" ? (
            <audio
              ref={audioRef}
              src={`/api/media?path=${encodeURIComponent(playing.path)}&stream=1`}
              controls
              autoPlay
              className="w-full"
            />
          ) : playing.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/media?path=${encodeURIComponent(playing.path)}&stream=1`}
              alt={playing.name}
              className="max-w-full max-h-[60vh] rounded-lg mx-auto"
            />
          ) : null}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : !currentPath ? (
        <div className="space-y-2">
          {roots.length === 0 ? (
            <div className="warm-card p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400">
                No media paths configured. Add media root paths in{" "}
                <a href="/settings" className="text-blue-500 hover:underline">Settings</a>.
              </p>
            </div>
          ) : (
            roots.map((root) => (
              <button
                key={root}
                onClick={() => loadDirectory(root)}
                className="w-full warm-card p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-left"
              >
                <FolderOpen className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{root}</span>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) => {
            const Icon = item.isDirectory ? FolderOpen : getTypeIcon(item.type);
            const colorClass = item.isDirectory
              ? "text-amber-500"
              : item.type === "video"
              ? "text-purple-500"
              : item.type === "audio"
              ? "text-blue-500"
              : item.type === "image"
              ? "text-emerald-500"
              : "text-slate-400";

            return (
              <button
                key={item.path}
                onClick={() =>
                  item.isDirectory ? loadDirectory(item.path) : playMedia(item)
                }
                className="warm-card p-4 flex flex-col items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition group relative"
              >
                <div className="relative">
                  <Icon className={cn("w-10 h-10", colorClass)} />
                  {!item.isDirectory && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <Play className="w-5 h-5 text-white drop-shadow-lg" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-center truncate w-full text-slate-800 dark:text-slate-100">
                  {item.name}
                </span>
                {!item.isDirectory && (
                  <span className="text-[10px] text-slate-400">{formatSize(item.size)}</span>
                )}
              </button>
            );
          })}
          {items.length === 0 && (
            <div className="col-span-full warm-card p-8 text-center">
              <p className="text-slate-400">No media files in this directory</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
