import { hasUsers, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { authLogger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    if (hasUsers()) {
      return Response.json({ error: "Setup already completed" }, { status: 403 });
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({ error: "Username and password required" }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const id = crypto.randomUUID();

    db.insert(users).values({
      id,
      username,
      passwordHash,
    }).run();

    return Response.json({ success: true });
  } catch (e) {
    authLogger.error("Setup failed", { error: e instanceof Error ? e.message : String(e) });
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ needsSetup: !hasUsers() });
}
