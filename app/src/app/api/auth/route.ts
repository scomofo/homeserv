import { NextRequest, NextResponse } from "next/server";
import { getUserByUsername, verifyPassword, createSession, deleteSession } from "@/lib/auth";
import { authLogger } from "@/lib/logger";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const user = getUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      authLogger.warn("Failed login attempt", { username });
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    authLogger.info("User logged in", { username });
    const token = await createSession(user.id);

    const response = NextResponse.json({ success: true });
    response.cookies.set("homeserv-session", token, {
      ...COOKIE_OPTIONS,
      maxAge: 72 * 60 * 60,
    });
    return response;
  } catch (e) {
    authLogger.error("Login error", { error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get("homeserv-session")?.value;
  if (token) {
    deleteSession(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("homeserv-session", "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}
