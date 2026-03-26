import { NextRequest } from "next/server";
import {
  getAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  executeActions,
  startAutomationRunner,
} from "@/lib/automation-engine";

export async function GET() {
  try {
    startAutomationRunner();
    const all = getAutomations();
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
    const body = await request.json();
    const { action } = body;

    if (action === "test") {
      // Test-run an automation's actions
      const { actions } = body;
      if (!actions || !Array.isArray(actions)) {
        return Response.json({ error: "actions array required" }, { status: 400 });
      }
      await executeActions(actions);
      return Response.json({ success: true });
    }

    // Create new automation
    const { name, trigger, actions: automationActions, enabled = true } = body;

    if (!name || !trigger || !automationActions) {
      return Response.json(
        { error: "name, trigger, and actions required" },
        { status: 400 }
      );
    }

    const id = createAutomation({ name, trigger, actions: automationActions, enabled });
    return Response.json({ id });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to create automation" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();

    if (!id) {
      return Response.json({ error: "id required" }, { status: 400 });
    }

    updateAutomation(id, updates);
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
    return Response.json({ success: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to delete automation" },
      { status: 500 }
    );
  }
}
