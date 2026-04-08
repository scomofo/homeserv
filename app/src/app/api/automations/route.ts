// app/src/app/api/automations/route.ts
import { NextRequest } from "next/server";
import {
  listAutomations,
  getAutomationById,
  createAutomation,
  updateAutomation,
  deleteAutomation,
} from "@/lib/automation-repo";
import { automationInputSchema } from "@/lib/automation-validation";
import { startAutomationEngine, refreshAutomationEngine } from "@/lib/automation-engine";
import type { AutomationInput } from "@/lib/automation-types";

export async function GET() {
  try {
    startAutomationEngine();
    const all = listAutomations();
    return Response.json(all);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to fetch automations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    startAutomationEngine();
    const body = await request.json();

    const result = automationInputSchema.safeParse(body);
    if (!result.success) {
      const messages = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      return Response.json({ error: messages.join("; ") }, { status: 400 });
    }

    const id = createAutomation(result.data as AutomationInput);
    refreshAutomationEngine();
    return Response.json({ success: true, id });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to create automation" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return Response.json({ error: "id required" }, { status: 400 });
    }

    const existing = getAutomationById(id);
    if (!existing) {
      return Response.json({ error: "Automation not found" }, { status: 404 });
    }

    // If only toggling enabled, skip full validation
    if (Object.keys(updates).length === 1 && updates.enabled !== undefined) {
      updateAutomation(id, { enabled: updates.enabled });
      refreshAutomationEngine();
      return Response.json({ success: true });
    }

    // Full update — validate the merged input
    const merged = {
      name: updates.name ?? existing.name,
      enabled: updates.enabled ?? existing.enabled,
      triggerType: updates.triggerType ?? existing.triggerType,
      triggerConfig: updates.triggerConfig ?? existing.triggerConfig,
      actionType: updates.actionType ?? existing.actionType,
      actionConfig: updates.actionConfig ?? existing.actionConfig,
    };

    const result = automationInputSchema.safeParse(merged);
    if (!result.success) {
      const messages = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      return Response.json({ error: messages.join("; ") }, { status: 400 });
    }

    updateAutomation(id, updates);
    refreshAutomationEngine();
    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to update automation" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return Response.json({ error: "id required" }, { status: 400 });
    }

    deleteAutomation(id);
    refreshAutomationEngine();
    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to delete automation" },
      { status: 500 }
    );
  }
}
