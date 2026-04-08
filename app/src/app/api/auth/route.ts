import { NextRequest } from "next/server";
import { getUserByUsername, verifyPassword, createSession, deleteSession } from "@/lib/auth";
import { authLogger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return Response.json({ error: "Username and password required" }, { status: 400 });
    }

    const user = getUserByUsername(username);
    if (!user) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      authLogger.warn("Failed login attempt", { username });
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    authLogger.info("User logged in", { username });
    const token = await createSession(user.id);

    const response = Response.json({ success: true });
    const isSecure = request.nextUrl.protocol === "https:";
    const headers = new Headers(response.headers);
    headers.append(
      "Set-Cookie",
      `homeserv-session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${72 * 60 * 60}${isSecure ? "; Secure" : ""}`
    );

    return new Response(response.body, {
      status: 200,
      headers,
    });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get("homeserv-session")?.value;
  if (token) {
    deleteSession(token);
  }

  const response = Response.json({ success: true });
  const headers = new Headers(response.headers);
  headers.append(
    "Set-Cookie",
    "homeserv-session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0"
  );

  return new Response(response.body, {
    status: 200,
    headers,
  });
}
