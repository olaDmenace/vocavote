@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

VocaVote (codename `oau-evote-social`) — a university voting platform for Obafemi Awolowo University with an integrated social/manifesto layer. The full spec lives in [`prd.md`](./prd.md) and is the source of truth for features, schema, security model, RPC contracts, and the phased implementation plan. **Read `prd.md` before designing anything new.**

Current state: Phases 0–11 of the PRD are implemented. Auth (register/login), profiles, the social feed with comments/markdown, candidate manifestos, admin election management + moderation, ballot casting, realtime tally, published results + CSV export, and the Vitest suite all exist. Treat the codebase — not the "not yet implemented" framing in older notes — as the source of truth for what's built; `prd.md` remains the spec for *intended* behavior and the acceptance criteria.

## Stack pinning (matters)

- **Next.js 16.2.4 + React 19.2.4** — newer than most training data. The bundled `AGENTS.md` rule is binding: consult `node_modules/next/dist/docs/` (and especially `01-app/01-getting-started/`, `02-guides/`, `18-upgrading.md`) before writing routing, data-fetching, caching, server-action, or middleware code. Do not rely on memorized Next.js 13/14 patterns.
- **Tailwind CSS 4** with `@tailwindcss/postcss` — config lives in `postcss.config.mjs` and `app/globals.css`, not a `tailwind.config.ts`.
- **ESLint 9 flat config** in `eslint.config.mjs` using `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
- TypeScript path alias: `@/*` → repo root.

## Commands

```bash
npm run dev       # next dev — local dev server on :3000
npm run build     # next build
npm run start     # next start (after build)
npm run lint      # eslint (flat config)
npm test          # vitest run — all tests (unit + integration)
npm run test:unit # vitest run tests/unit only
npm run test:watch
```

Run a single file/test: `npx vitest run tests/unit/validation.test.ts` or filter by name with `-t "<pattern>"`.

Test layout: `tests/unit` (pure, no DB — matric/email, Zod validation) and `tests/integration` (real Supabase). The integration suite (`tests/integration/cast-vote.test.ts`) self-skips via `describe.runIf` unless `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and a real `SUPABASE_SERVICE_ROLE_KEY` are set — so `npm test` stays green without a project, but a "passing" run may have skipped the DB tests. `tests/setup.ts` loads `.env.local`.

## Architecture (target, per PRD)

Next.js App Router on Vercel → Supabase (Postgres + Auth + Storage + Realtime). The non-obvious choices that drive most decisions:

- **One vote enforced by the database, not the app.** `votes` has `UNIQUE(student_id, position_id)`; all casts go through the `cast_vote()` `SECURITY DEFINER` RPC, and direct `INSERT` on `votes` is revoked from `authenticated`. App code must catch the unique-violation error and translate it to `already_voted`.
- **RLS is the access-control layer.** Every public table has RLS on. Students cannot `SELECT` from `votes` — results are exposed only via the `published_results` view gated on `elections.results_published = true`. Don't add app-layer auth checks that duplicate RLS; rely on it.
- **Synthetic email login.** Users authenticate by matric number. Server actions derive a synthetic email (`csc-2019-115@student.oauife.edu.ng` style: lowercase matric, `/`→`-`) and pass it to `signInWithPassword`. Login throttling is a DB concern (`check_throttle` / `record_login_attempt` RPCs + `login_attempts` table), not app middleware.
- **Three Supabase clients, different powers.** `lib/supabase/client.ts` (browser, anon), `lib/supabase/server.ts` (server, anon + user cookies via `@supabase/ssr`), `lib/supabase/admin.ts` (service role, server-only, RLS bypass). The service role key must never reach a client component or be imported into a file that runs in the browser.
- **Server Actions for all mutations.** CSRF is handled by Next's built-in origin checks — do not roll a CSRF token system. All action inputs validated with Zod; standard return shape is `{ ok: true; data } | { ok: false; error: { code, message } }` (see PRD §9.2).
- **Realtime instead of polling.** Admin tally subscribes to `postgres_changes` on `votes`. RLS still applies to realtime subscriptions, which is why students don't receive vote events.
- **Route groups segment auth scopes:** `app/(auth)`, `app/(app)`, `app/(admin)`. Session refresh runs in **`proxy.ts` at the repo root — not `middleware.ts`** (Next.js 16 renamed Middleware to Proxy; it exports a `proxy()` function). It delegates to `updateSession` in `lib/supabase/middleware.ts`. Actual access gating lives in `lib/auth/guards.ts` (`requireUser`/`requireAdmin`) called from server components/actions — the proxy only refreshes the Supabase session cookie.

PRD §11 has the full target directory layout. PRD §12 has the phased plan with explicit acceptance criteria per phase — follow it; don't start Phase N+1 until Phase N's acceptance passes.

## Supabase tooling

- `.mcp.json` configures the Supabase MCP server. The Supabase MCP tools (`mcp__supabase__*`) are available for project/SQL/migration/edge-function operations against a remote Supabase project.
- Most schema lives **on the remote project**, not in the repo: 20 migrations have been applied via MCP but only one (`supabase/migrations/20260625130301_grant_execute_is_admin_to_authenticated.sql`) is checked in — the other 19 plus `supabase/seed.sql` (seeds demo users incl. `auth.identities` + zeroed token columns) are the rest. Use `mcp__supabase__list_tables` / `list_migrations` to inspect the live schema. When applying new schema changes, prefer the MCP `apply_migration` tool (or local `supabase` CLI) over ad-hoc SQL, and follow the timestamped migration names in PRD §11.
- Generated types belong at `types/database.types.ts` (via `supabase gen types`). Don't hand-edit.
