# HomeServ – Login Cookie Fix Handoff

## Purpose
Fix the current login flow where `POST /api/auth` returns `200 OK`, but the user still cannot get past the login page.

This strongly suggests the authentication request succeeds, but the session cookie is not being persisted/reused reliably on the next request.

This is a **small, targeted auth patch**.
Do not refactor unrelated auth logic.

---

## Symptom
Observed behavior:
- login request returns `200 OK`
- user is still sent back to `/login`

That means:
- credentials are valid
- session creation likely succeeded
- middleware is not seeing a valid `homeserv-session` cookie on the next request

---

## Likely Cause
In `app/src/app/api/auth/route.ts`, the login route currently:
- creates `Response.json(...)`
- copies headers into a new `Headers`
- appends `Set-Cookie`
- constructs a brand new `Response`

This can lead to flaky cookie persistence behavior.

---

## Goal
Make session cookie handling robust and explicit using `NextResponse` cookie APIs.

---

## Required Change
Update:
- `app/src/app/api/auth/route.ts`

### Use `NextResponse`
Import:
```ts
import { NextRequest, NextResponse } from "next/server";
```

### POST /api/auth
On successful login:
1. create session token as today
2. return `NextResponse.json({ success: true })`
3. set cookie via `response.cookies.set(...)`

Use:
- name: `homeserv-session`
- `httpOnly: true`
- `sameSite: "lax"`
- `path: "/"`
- `maxAge: 72 * 60 * 60`
- `secure: process.env.NODE_ENV === "production"`

### DELETE /api/auth
For logout:
- return `NextResponse.json({ success: true })`
- clear the cookie using `response.cookies.set("homeserv-session", "", { ... maxAge: 0 ... })`

Use the same path/samesite/httpOnly/secure configuration.

---

## Important
Do not change:
- credential validation
- password verification
- session creation logic
- middleware behavior (unless absolutely required after patch)

The first goal is to make sure the cookie is reliably set and cleared.

---

## Suggested Implementation

### Replace this pattern
Do NOT keep the manual header copying / new `Response(...)` pattern.

### Use this pattern instead
```ts
const response = NextResponse.json({ success: true });
response.cookies.set("homeserv-session", token, {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 72 * 60 * 60,
  secure: process.env.NODE_ENV === "production",
});
return response;
```

And for logout:
```ts
const response = NextResponse.json({ success: true });
response.cookies.set("homeserv-session", "", {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 0,
  secure: process.env.NODE_ENV === "production",
});
return response;
```

---

## Manual Verification
After patching:

1. restart app
2. log in with valid credentials
3. open browser dev tools
4. verify `homeserv-session` appears under cookies
5. refresh `/`

### Expected result
- user remains in the app
- middleware no longer redirects back to `/login`

### Also test logout
- call logout flow
- verify cookie is removed
- verify protected routes redirect to `/login`

---

## Acceptance Criteria
This patch is complete when:
- login still returns `200 OK`
- `homeserv-session` cookie is visibly present after login
- user can navigate past login and remain authenticated
- logout clears the cookie correctly

---

## If Issue Persists After Patch
Only then investigate:
- JWT secret mismatch between runtime contexts
- middleware verification behavior
- environment/runtime restart issues

But do not start there.
Fix cookie setting first.
