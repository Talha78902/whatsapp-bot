# WhatsApp Business Platform

A full-stack WhatsApp Business management platform with customer management, bulk campaigns, conversation inbox, analytics, and settings — backed by the Meta WhatsApp Business API.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port from `$PORT`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env vars:
  - `JWT_SECRET` (or `SESSION_SECRET`) — secret for signing JWTs (min 32 chars)
  - `PORT` — port the server listens on

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Auth: JWT (bcryptjs + jsonwebtoken)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS-compatible ESM bundle)

## Where things live

- `artifacts/api-server/src/routes/` — all API route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth middleware + token helpers
- `artifacts/api-server/src/seed-admin.ts` — seeds initial admin user
- `lib/api-zod/src/generated/api.ts` — **source of truth** for all Zod validation schemas
- `lib/api-spec/openapi.yaml` — OpenAPI spec (for codegen)

## Architecture decisions

- JWT-based auth with short-lived access tokens (15m) and long-lived refresh tokens (7d)
- All settings (WhatsApp credentials, AI config, business info) stored as JSON in the `settings` table — no extra env vars needed at runtime beyond the required ones
- esbuild bundles the entire server into a single ESM `.mjs` file for fast cold starts
- `@workspace/api-zod` is a workspace package bundled at build time — Railway sees the full monorepo

## Product

- `/api/auth/*` — login, register, token refresh, profile, change password
- `/api/customers` — CRUD + bulk import + stats + notes
- `/api/campaigns` — CRUD + schedule/pause/resume/cancel/duplicate + analytics
- `/api/templates` — WhatsApp message template management
- `/api/conversations` — inbox with join to customer data + message send + handoff
- `/api/dashboard/*` — KPIs, activity feed, message stats, campaign status breakdown
- `/api/analytics/*` — overview, message timeline, top campaigns
- `/api/settings/*` — WhatsApp, AI, and business configuration
- `/api/webhooks/whatsapp` — receive + process inbound WhatsApp messages

## Default admin credentials

- Email: `admin@talha.com`
- Password: `Admin@1234`
- Run seed: `pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/api-server run seed`

## Gotchas

- `JWT_SECRET` (or `SESSION_SECRET`) must be set **before** the server starts — the middleware throws at import time if missing
- The esbuild overrides in `pnpm-workspace.yaml` pin esbuild to `0.27.3` and exclude non-linux-x64 binaries — this is fine for Railway (linux-x64) but will break on macOS ARM without changes

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
