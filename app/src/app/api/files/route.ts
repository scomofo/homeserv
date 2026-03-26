import { NextRequest } from "next/server";
import { listDirectory, getFileStream, saveUploadedFile, deleteFile, getRoots, isPathAllowed } from "@/lib/file-service";
import { Readable } from "stream";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");
    const download = searchParams.get("download") === "1";

    // If no path, return the root directories
    if (!filePath) {
      const roots = getRoots();
      return Response.json({ roots });
    }

    if (!isPathAllowed(filePath)) {
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    // If download, stream the file
    if (download) {
      const { stream, size, mimeType } = getFileStream(filePath);
      const webStream = Readable.toWeb(stream) as ReadableStream;

      const fileName = filePath.split("/").pop() || "download";
      return new Response(webStream, {
        headers: {
          "Content-Type": mimeType,
          "Content-Length": String(size),
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    // Otherwise, list directory
    const entries = listDirectory(filePath);
    return Response.json({ path: filePath, entries });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error";
    const status = message.includes("Access denied") ? 403 : message.includes("not found") ? 404 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const dirPath = formData.get("path") as string;
    const file = formData.get("file") as File | null;

    if (!dirPath || !file) {
      return Response.json({ error: "path and file required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const savedPath = await saveUploadedFile(dirPath, file.name, buffer);

    return Response.json({ success: true, path: savedPath });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { path: filePath } = await request.json();

    if (!filePath) {
      return Response.json({ error: "path required" }, { status: 400 });
    }

    deleteFile(filePath);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Delete failed" },
      { status: 500 }
    );
  }
}
