import fs from "fs";
import path from "path";
import { getSetting } from "./settings";

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  extension: string;
}

function getAllowedRoots(): string[] {
  const raw = getSetting("file_roots", "[]");
  try {
    const roots = JSON.parse(raw);
    if (!Array.isArray(roots)) return [];
    return roots.filter((r: unknown) => typeof r === "string");
  } catch {
    return [];
  }
}

export function isPathAllowed(requestedPath: string): boolean {
  const resolved = path.resolve(requestedPath);
  const roots = getAllowedRoots();
  return roots.some((root) => resolved.startsWith(path.resolve(root)));
}

export function getRoots(): string[] {
  return getAllowedRoots();
}

export function listDirectory(dirPath: string): FileEntry[] {
  const resolved = path.resolve(dirPath);
  if (!isPathAllowed(resolved)) {
    throw new Error("Access denied: path not in allowed roots");
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error("Directory not found");
  }

  const entries = fs.readdirSync(resolved, { withFileTypes: true });

  return entries
    .filter((entry) => !entry.name.startsWith("."))
    .map((entry) => {
      const fullPath = path.join(resolved, entry.name);
      try {
        const stat = fs.statSync(fullPath);
        return {
          name: entry.name,
          path: fullPath.replace(/\\/g, "/"),
          isDirectory: entry.isDirectory(),
          size: stat.size,
          modified: stat.mtime.toISOString(),
          extension: entry.isDirectory() ? "" : path.extname(entry.name).toLowerCase(),
        };
      } catch {
        return null;
      }
    })
    .filter((e): e is FileEntry => e !== null)
    .sort((a, b) => {
      // Directories first, then alphabetical
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function getFileStream(filePath: string): { stream: fs.ReadStream; size: number; mimeType: string } {
  const resolved = path.resolve(filePath);
  if (!isPathAllowed(resolved)) {
    throw new Error("Access denied");
  }

  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    throw new Error("File not found");
  }

  const stat = fs.statSync(resolved);
  const ext = path.extname(resolved).toLowerCase();

  const mimeTypes: Record<string, string> = {
    ".txt": "text/plain",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".json": "application/json",
    ".xml": "application/xml",
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".ts": "text/plain",
    ".tsx": "text/plain",
    ".py": "text/plain",
    ".md": "text/plain",
    ".csv": "text/csv",
    ".log": "text/plain",
  };

  return {
    stream: fs.createReadStream(resolved),
    size: stat.size,
    mimeType: mimeTypes[ext] || "application/octet-stream",
  };
}

export function getFileRangeStream(
  filePath: string,
  start: number,
  end: number
): { stream: fs.ReadStream; size: number; totalSize: number; mimeType: string } {
  const resolved = path.resolve(filePath);
  if (!isPathAllowed(resolved)) throw new Error("Access denied");

  const stat = fs.statSync(resolved);
  const ext = path.extname(resolved).toLowerCase();

  const mimeTypes: Record<string, string> = {
    ".mp4": "video/mp4", ".webm": "video/webm", ".mkv": "video/x-matroska",
    ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".flac": "audio/flac",
  };

  return {
    stream: fs.createReadStream(resolved, { start, end }),
    size: end - start + 1,
    totalSize: stat.size,
    mimeType: mimeTypes[ext] || "application/octet-stream",
  };
}

export async function saveUploadedFile(dirPath: string, fileName: string, data: Buffer): Promise<string> {
  const resolved = path.resolve(dirPath);
  if (!isPathAllowed(resolved)) throw new Error("Access denied");

  // Sanitize filename
  const safeName = fileName.replace(/[<>:"/\\|?*]/g, "_");
  const destPath = path.join(resolved, safeName);

  fs.writeFileSync(destPath, data);
  return destPath.replace(/\\/g, "/");
}

export function deleteFile(filePath: string): void {
  const resolved = path.resolve(filePath);
  if (!isPathAllowed(resolved)) throw new Error("Access denied");
  if (!fs.existsSync(resolved)) throw new Error("File not found");

  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) {
    fs.rmdirSync(resolved, { recursive: true });
  } else {
    fs.unlinkSync(resolved);
  }
}
