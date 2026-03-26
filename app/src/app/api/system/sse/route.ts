import { getSystemSnapshot, startMetricCollector } from "@/lib/system-monitor";

export const dynamic = "force-dynamic";

export async function GET() {
  startMetricCollector();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial snapshot immediately
      try {
        const data = await getSystemSnapshot();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      } catch {
        // Continue even if first snapshot fails
      }

      const interval = setInterval(async () => {
        try {
          const data = await getSystemSnapshot();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // Skip this tick on error
        }
      }, 2000);

      // Handle client disconnect
      const cleanup = () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      // Store cleanup so it can be called on cancel
      (controller as unknown as { _cleanup: () => void })._cleanup = cleanup;
    },
    cancel(controller) {
      const c = controller as unknown as { _cleanup?: () => void };
      if (c._cleanup) c._cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
