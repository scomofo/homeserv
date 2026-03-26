"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FolderOpen,
  File,
  ArrowLeft,
  Upload,
  Download,
  Trash2,
  Image,
  FileText,
  Film,
  Music,
  Archive,
  ChevronRight,
  LayoutGrid,
  List,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  extension: string;
}

function formatSize(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

function getFileIcon(ext: string) {
  const images = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"];
  const videos = [".mp4", ".webm", ".mkv", ".avi", ".mov"];
  const audio = [".mp3", ".wav", ".ogg", ".flac", ".aac"];
  const archives = [".zip", ".rar", ".7z", ".tar", ".gz"];

  if (images.includes(ext)) return Image;
  if (videos.includes(ext)) return Film;
  if (audio.includes(ext)) return Music;
  if (archives.includes(ext)) return Archive;
  return FileText;
}

function isPreviewable(ext: string): boolean {
  return [
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
    ".txt", ".md", ".json", ".js", ".ts", ".tsx", ".css", ".html", ".py", ".log", ".csv",
    ".pdf",
  ].includes(ext);
}

export default function FilesPage() {
  const [roots, setRoots] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [preview, setPreview] = useState<{ path: string; name: string; ext: string } | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDirectory = useCallback(async (dirPath: string | null) => {
    setLoading(true);
    setPreview(null);
    try {
      const url = dirPath ? `/api/files?path=${encodeURIComponent(dirPath)}` : "/api/files";
      const res = await fetch(url);
      const data = await res.json();

      if (data.roots) {
        setRoots(data.roots);
        setCurrentPath(null);
        setEntries([]);
      } else {
        setCurrentPath(dirPath);
        setEntries(data.entries || []);
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

    // Check if parent is still within roots
    const isRoot = roots.some((r) => r.replace(/\\/g, "/") === currentPath.replace(/\\/g, "/"));
    if (isRoot) {
      loadDirectory(null);
    } else {
      loadDirectory(parent);
    }
  }

  async function handleUpload(files: FileList) {
    if (!currentPath || files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("path", currentPath);
      form.append("file", file);
      await fetch("/api/files", { method: "POST", body: form });
    }

    setUploading(false);
    loadDirectory(currentPath);
  }

  async function handleDelete(filePath: string) {
    if (!confirm("Delete this file?")) return;
    await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: filePath }),
    });
    loadDirectory(currentPath);
  }

  async function openPreview(entry: FileEntry) {
    setPreview({ path: entry.path, name: entry.name, ext: entry.extension });

    const textExts = [".txt", ".md", ".json", ".js", ".ts", ".tsx", ".css", ".html", ".py", ".log", ".csv"];
    if (textExts.includes(entry.extension)) {
      try {
        const res = await fetch(`/api/files?path=${encodeURIComponent(entry.path)}&download=1`);
        const text = await res.text();
        setPreviewContent(text.slice(0, 50000));
      } catch {
        setPreviewContent("Failed to load preview");
      }
    } else {
      setPreviewContent(null);
    }
  }

  // Breadcrumb parts
  const breadcrumbs = currentPath
    ? currentPath.replace(/\\/g, "/").split("/").filter(Boolean)
    : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-6 h-6 text-emerald-500" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">File Manager</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {viewMode === "grid" ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Breadcrumb + actions */}
      <div className="warm-card p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm overflow-x-auto">
          <button
            onClick={() => loadDirectory(null)}
            className="text-blue-500 hover:text-blue-600 shrink-0"
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
                  className="text-blue-500 hover:text-blue-600"
                >
                  {part}
                </button>
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          {currentPath && (
            <>
              <button
                onClick={navigateUp}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Go up"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                {uploading ? "Uploading..." : "Upload"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
            </>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        {/* File list */}
        <div className={cn("flex-1", preview && "max-w-[60%]")}>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !currentPath ? (
            // Show roots
            <div className="space-y-2">
              {roots.length === 0 ? (
                <div className="warm-card p-8 text-center">
                  <p className="text-slate-500 dark:text-slate-400">
                    No file paths configured. Add allowed root paths in{" "}
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
                    <FolderOpen className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {root}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : viewMode === "list" ? (
            // List view
            <div className="warm-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Name</th>
                    <th className="text-right px-4 py-2 text-slate-500 font-medium w-24">Size</th>
                    <th className="text-right px-4 py-2 text-slate-500 font-medium w-40 hidden md:table-cell">Modified</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const Icon = entry.isDirectory ? FolderOpen : getFileIcon(entry.extension);
                    return (
                      <tr
                        key={entry.path}
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer"
                        onClick={() =>
                          entry.isDirectory
                            ? loadDirectory(entry.path)
                            : isPreviewable(entry.extension) && openPreview(entry)
                        }
                      >
                        <td className="px-4 py-2.5 flex items-center gap-2">
                          <Icon
                            className={cn(
                              "w-4 h-4 shrink-0",
                              entry.isDirectory ? "text-amber-500" : "text-slate-400"
                            )}
                          />
                          <span className="truncate text-slate-800 dark:text-slate-100">
                            {entry.name}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-400">
                          {entry.isDirectory ? "--" : formatSize(entry.size)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-400 hidden md:table-cell">
                          {new Date(entry.modified).toLocaleDateString()}
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                            {!entry.isDirectory && (
                              <a
                                href={`/api/files?path=${encodeURIComponent(entry.path)}&download=1`}
                                className="p-1 rounded text-slate-400 hover:text-blue-500 transition"
                                title="Download"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => handleDelete(entry.path)}
                              className="p-1 rounded text-slate-400 hover:text-red-500 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        Empty directory
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            // Grid view
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {entries.map((entry) => {
                const Icon = entry.isDirectory ? FolderOpen : getFileIcon(entry.extension);
                return (
                  <button
                    key={entry.path}
                    onClick={() =>
                      entry.isDirectory
                        ? loadDirectory(entry.path)
                        : isPreviewable(entry.extension) && openPreview(entry)
                    }
                    className="warm-card p-4 flex flex-col items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                  >
                    <Icon
                      className={cn(
                        "w-8 h-8",
                        entry.isDirectory ? "text-amber-500" : "text-slate-400"
                      )}
                    />
                    <span className="text-xs text-center truncate w-full text-slate-800 dark:text-slate-100">
                      {entry.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview panel */}
        {preview && (
          <div className="w-[40%] warm-card p-4 shrink-0 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                {preview.name}
              </h3>
              <button
                onClick={() => setPreview(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {[".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"].includes(preview.ext) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/files?path=${encodeURIComponent(preview.path)}&download=1`}
                alt={preview.name}
                className="w-full rounded-lg"
              />
            ) : preview.ext === ".pdf" ? (
              <iframe
                src={`/api/files?path=${encodeURIComponent(preview.path)}&download=1`}
                className="w-full h-96 rounded-lg"
              />
            ) : previewContent !== null ? (
              <pre className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                {previewContent}
              </pre>
            ) : (
              <p className="text-sm text-slate-400">No preview available</p>
            )}

            <div className="mt-3">
              <a
                href={`/api/files?path=${encodeURIComponent(preview.path)}&download=1`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-500/30 transition"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
