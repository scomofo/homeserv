import { NextRequest } from "next/server";
import { listMediaDirectory, getMediaRootPaths, isMediaPathAllowed, getMediaFileInfo } from "@/lib/media-service";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dirPath = searchParams.get("path");
    const stream = searchParams.get("stream") === "1";

    if (!dirPath) {
      const roots = getMediaRootPaths();
      return Response.json({ roots });
    }

    if (!isMediaPathAllowed(dirPath)) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // Stream a file
    if (stream) {
      const info = getMediaFileInfo(dirPath);
      if (!info.exists) {
        return Response.json({ error: "File not found" }, { status: 404 });
      }

      const resolved = path.resolve(dirPath);
      const rangeHeader = request.headers.get("range");

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (match) {
          const start = parseInt(match[1], 10);
          const end = match[2] ? parseInt(match[2], 10) : info.size - 1;
          const chunkSize = end - start + 1;

          const fileStream = fs.createReadStream(resolved, { start, end });
          const webStream = Readable.toWeb(fileStream) as ReadableStream;

          return new Response(webStream, {
            status: 206,
            headers: {
              "Content-Type": info.mimeType,
              "Content-Length": String(chunkSize),
              "Content-Range": `bytes ${start}-${end}/${info.size}`,
              "Accept-Ranges": "bytes",
            },
          });
        }
      }

      // Full file
      const fileStream = fs.createReadStream(resolved);
      const webStream = Readable.toWeb(fileStream) as ReadableStream;

      return new Response(webStream, {
        headers: {
          "Content-Type": info.mimeType,
          "Content-Length": String(info.size),
          "Accept-Ranges": "bytes",
        },
      });
    }

    // List directory
    const items = listMediaDirectory(dirPath);
    return Response.json({ path: dirPath, items });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    const status = message.includes("Access denied") ? 403 : 500;
    return Response.json({ error: message }, { status });
  }
}
