# HomeServ – Codex Handoff: Phase 2 (Stabilization & Trust)

## Goal
Make HomeServ **reliable, safe, and deployable** for real daily use.

This is NOT about new features.
This is about:
- security
- stability
- trust

---

## Scope (Do in Order)

1. Security hardening
2. Logging / observability
3. Error handling standardization
4. Backup & export
5. Dockerization

---

# 1. Security Hardening

## Tasks

### Enforce JWT_SECRET
- Remove fallback secret
- Throw on startup if missing

### Secure cookies
- Add `Secure` flag when HTTPS

### Session validation
- Middleware must validate session exists in DB
- Not just JWT

### Encrypt sensitive settings
Encrypt before storing:
- ha_token
- mqtt_password
- vnc_password

Use simple symmetric encryption (Node crypto)

---

# 2. Logging / Observability

## Add logging module
Create:
- `lib/logger.ts`

Log:
- automation runs
- auth events
- device actions
- errors

Use simple structured logs (console-based)

---

# 3. Error Handling

## Standardize API responses

All APIs must return:

Success:
{ "success": true }

Error:
{ "error": "message" }


## Remove silent failures
- Replace `catch {}` with logging
- Return meaningful messages

---

# 4. Backup & Export

## Add endpoints

- `GET /api/export`
- `POST /api/import`

Export:
- automations
- settings

Format:
JSON file

---

# 5. Dockerization

## Add

- `Dockerfile`
- `docker-compose.yml`

Requirements:
- mount `/data`
- expose port
- env vars for config

---

## Definition of Done

- App fails fast without JWT_SECRET
- Sessions properly validated
- Sensitive data encrypted
- Logs visible for key actions
- No silent API failures
- Export/import works
- App runs via Docker

---

## Constraint

Do NOT:
- add new features
- refactor automation engine
- change UI unnecessarily

Focus on trust and stability only.
