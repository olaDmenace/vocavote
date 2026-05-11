@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

VocaVote (codename `oau-evote-social`) — a university voting platform for Obafemi Awolowo University with an integrated social/manifesto layer. The full spec lives in [`prd.md`](./prd.md) and is the source of truth for features, schema, security model, RPC contracts, and the phased implementation plan. **Read `prd.md` before designing anything new.**

Current state: fresh `create-next-app` scaffold (only `app/layout.tsx` and `app/page.tsx` exist). All Supabase integration, route groups, server actions, and migrations described in `prd.md` are not yet implemented — Phase 0/1 work.

## Stack pinning (matters)

- **Next.js 16.2.4 + React 19.2.4** — newer than most training data. The bundled `AGENTS.md` rule is binding: consult `node_modules/next/dist/docs/` (and especially `01-app/01-getting-started/`, `02-guides/`, `18-upgrading.md`) before writing routing, data-fetching, caching, server-action, or middleware code. Do not rely on memorized Next.js 13/14 patterns.
- **Tailwind CSS 4** with `@tailwindcss/postcss` — config lives in `postcss.config.mjs` and `app/globals.css`, not a `tailwind.config.ts`.
- **ESLint 9 flat config** in `eslint.config.mjs` using `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`.
- TypeScript path alias: `@/*` → repo root.

## Commands

```bash
npm run dev      # next dev — local dev server on :3000
npm run build    # next build
npm run start    # next start (after build)
npm run lint     # eslint (flat config)
```

There is no test runner installed yet; `prd.md` Phase 11 plans Vitest. Don't claim tests pass — there are none.

## Architecture (target, per PRD)

Next.js App Router on Vercel → Supabase (Postgres + Auth + Storage + Realtime). The non-obvious choices that drive most decisions:

- **One vote enforced by the database, not the app.** `votes` has `UNIQUE(student_id, position_id)`; all casts go through the `cast_vote()` `SECURITY DEFINER` RPC, and direct `INSERT` on `votes` is revoked from `authenticated`. App code must catch the unique-violation error and translate it to `already_voted`.
- **RLS is the access-control layer.** Every public table has RLS on. Students cannot `SELECT` from `votes` — results are exposed only via the `published_results` view gated on `elections.results_published = true`. Don't add app-layer auth checks that duplicate RLS; rely on it.
- **Synthetic email login.** Users authenticate by matric number. Server actions derive a synthetic email (`csc-2019-115@student.oauife.edu.ng` style: lowercase matric, `/`→`-`) and pass it to `signInWithPassword`. Login throttling is a DB concern (`check_throttle` / `record_login_attempt` RPCs + `login_attempts` table), not app middleware.
- **Three Supabase clients, different powers.** `lib/supabase/client.ts` (browser, anon), `lib/supabase/server.ts` (server, anon + user cookies via `@supabase/ssr`), `lib/supabase/admin.ts` (service role, server-only, RLS bypass). The service role key must never reach a client component or be imported into a file that runs in the browser.
- **Server Actions for all mutations.** CSRF is handled by Next's built-in origin checks — do not roll a CSRF token system. All action inputs validated with Zod; standard return shape is `{ ok: true; data } | { ok: false; error: { code, message } }` (see PRD §9.2).
- **Realtime instead of polling.** Admin tally subscribes to `postgres_changes` on `votes`. RLS still applies to realtime subscriptions, which is why students don't receive vote events.
- **Route groups segment auth scopes:** `app/(auth)`, `app/(app)`, `app/(admin)` — `middleware.ts` refreshes sessions and gates these groups; `lib/auth/guards.ts` provides `requireUser`/`requireAdmin` for server components/actions.

PRD §11 has the full target directory layout. PRD §12 has the phased plan with explicit acceptance criteria per phase — follow it; don't start Phase N+1 until Phase N's acceptance passes.

## Supabase tooling

- `.mcp.json` configures the Supabase MCP server. The Supabase MCP tools (`mcp__supabase__*`) are available for project/SQL/migration/edge-function operations against a remote Supabase project.
- Migrations are planned under `supabase/migrations/` with the timestamped names in PRD §11. When applying schema changes, prefer the MCP `apply_migration` tool or local `supabase` CLI over ad-hoc SQL.
- Generated types belong at `types/database.types.ts` (via `supabase gen types`). Don't hand-edit.
