import fs from "fs";
import path from "path";
import { getSetting } from "./settings";

export interface MediaItem {
  name: string;
  path: string;
  isDirectory: boolean;
  type: "video" | "audio" | "image" | "other";
  size: number;
  modified: string;
  extension: string;
}

const VIDEO_EXTS = [".mp4", ".webm", ".mkv", ".avi", ".mov", ".m4v", ".wmv"];
const AUDIO_EXTS = [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma"];
const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"];

function getMediaRoots(): string[] {
  const raw = getSetting("media_roots", "[]");
  try {
    const roots = JSON.parse(raw);
    if (!Array.isArray(roots)) return [];
    return roots.filter((r: unknown) => typeof r === "string");
  } catch {
    return [];
  }
}

export function isMediaPathAllowed(requestedPath: string): boolean {
  const resolved = path.resolve(requestedPath);
  const roots = getMediaRoots();
  return roots.some((root) => resolved.startsWith(path.resolve(root)));
}

export function getMediaRootPaths(): string[] {
  return getMediaRoots();
}

function getMediaType(ext: string): MediaItem["type"] {
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (AUDIO_EXTS.includes(ext)) return "audio";
  if (IMAGE_EXTS.includes(ext)) return "image";
  return "other";
}

export function listMediaDirectory(dirPath: string): MediaItem[] {
  const resolved = path.resolve(dirPath);
  if (!isMediaPathAllowed(resolved)) {
    throw new Error("Access denied");
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error("Directory not found");
  }

  const entries = fs.readdirSync(resolved, { withFileTypes: true });
  const mediaExts = [...VIDEO_EXTS, ...AUDIO_EXTS, ...IMAGE_EXTS];

  return entries
    .filter((entry) => {
      if (entry.name.startsWith(".")) return false;
      if (entry.isDirectory()) return true;
      const ext = path.extname(entry.name).toLowerCase();
      return mediaExts.includes(ext);
    })
    .map((entry) => {
      const fullPath = path.join(resolved, entry.name);
      try {
        const stat = fs.statSync(fullPath);
        const ext = path.extname(entry.name).toLowerCase();
        return {
          name: entry.name,
          path: fullPath.replace(/\\/g, "/"),
          isDirectory: entry.isDirectory(),
          type: entry.isDirectory() ? "other" as const : getMediaType(ext),
          size: stat.size,
          modified: stat.mtime.toISOString(),
          extension: ext,
        };
      } catch {
        return null;
      }
    })
    .filter((e): e is MediaItem => e !== null)
    .sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function getMediaFileInfo(filePath: string): {
  size: number;
  mimeType: string;
  exists: boolean;
} {
  const resolved = path.resolve(filePath);
  if (!isMediaPathAllowed(resolved)) throw new Error("Access denied");
  if (!fs.existsSync(resolved)) return { size: 0, mimeType: "", exists: false };

  const stat = fs.statSync(resolved);
  const ext = path.extname(resolved).toLowerCase();

  const mimeTypes: Record<string, string> = {
    ".mp4": "video/mp4", ".webm": "video/webm", ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo", ".mov": "video/quicktime", ".m4v": "video/mp4",
    ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
    ".flac": "audio/flac", ".aac": "audio/aac", ".m4a": "audio/mp4",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp",
  };

  return {
    size: stat.size,
    mimeType: mimeTypes[ext] || "application/octet-stream",
    exists: true,
  };
}
