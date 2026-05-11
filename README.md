# VocaVote (oau-evote-social)

A web-based university voting platform with an integrated manifesto and
discussion layer, built on Next.js 16 + Supabase. See [`prd.md`](./prd.md) for
the full product spec.

## Tech stack

- **Frontend:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4
- **Forms & validation:** React Hook Form + Zod
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime)
- **Markdown:** `react-markdown` + `remark-gfm` + `rehype-sanitize`

## One-time setup

1. **Clone & install**
   ```bash
   npm install
   ```
   On Windows behind a corporate cert chain, prefix install commands with
   `NODE_OPTIONS=--use-system-ca`.

2. **Environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/publishable key.
   - `SUPABASE_SERVICE_ROLE_KEY` — service-role key (server-only).
     Grab from Supabase dashboard → Project → Settings → API → service_role.
   - `IP_HASH_SALT` — any sufficiently long random string. Used for
     sha256(ip + salt) in `votes.ip_hash` and `login_attempts.ip_hash`.

3. **Supabase auth setting**
   In Supabase dashboard → Authentication → Sign In / Up:
   - Set **Confirm email = off** (PRD §14 Q4 — v1 logs in by matric+password
     only and the synthetic email is internal).

## Daily commands

```bash
npm run dev      # http://localhost:3000
npm run build    # production build (runs type-check + lint)
npm run start    # production server (after build)
npm run lint     # ESLint flat config (eslint-config-next)
```

There is no test runner installed yet — see PRD Phase 11.

## Seed accounts

Phase 1 seeded:

| Role    | Matric         | Password       |
| ------- | -------------- | -------------- |
| Admin   | `ADM/2026/001` | `Admin#1234`   |
| Student | `CSC/2019/001` | `Student#1234` |
| ...     | through `CSC/2019/050` | same       |

The first 6 students (`001`–`006`) are pre-approved as candidates on the
seeded "OAU SUG Election 2026" — two per position (President, Vice President,
General Secretary).

## How auth works (the non-obvious bit)

Users authenticate by **matric number**, not email. Server actions derive a
synthetic email like `csc-2019-115@student.oauife.edu.ng` (lowercase matric,
`/` → `-`) and hand it to Supabase Auth. The mapping is in
`lib/auth/matric-to-email.ts`.

## Security model (the most non-obvious bit)

- **Single vote per (student, position)** is enforced by
  `UNIQUE(student_id, position_id)` on `votes`. The `cast_vote()` `SECURITY
  DEFINER` RPC catches the unique-violation and returns `already_voted`.
  Direct `INSERT` on `votes` is revoked from the `authenticated` role.
- **Results gating** lives in the database: students cannot `SELECT` from
  `votes` (only their own rows, for ballot UX); results read through the
  `published_results` view, which itself filters on
  `elections.results_published = true`.
- **No app-layer CSRF tokens.** Next.js Server Actions are POST-only,
  origin-checked, and tied to React form tokens.
- The **service-role key never leaves the server**. `lib/supabase/admin.ts`
  imports `'server-only'` to enforce this at build time.

## Project layout

```
app/
  (auth)/                 login, register
  (app)/                  feed, ballot, candidates, profile, results
  (admin)/                dashboard, elections, moderation
  actions/                'use server' actions (auth, posts, votes, profile, admin)
  api/                    route handlers (health, results CSV export)
components/
  ui/                     Button, Input, Card, Alert, … (no shadcn dep)
  feed/                   PostCard, CommentThread, Markdown
  nav/                    MainNav, UserMenu
  profile/                Avatar
lib/
  supabase/               browser, server, admin, proxy session helper
  auth/                   matric-to-email, requireUser/Admin guards
  validation/             Zod schemas
  realtime/               use-tally hook
  utils/                  cn, ip-hash, format, avatar
proxy.ts                  Next 16 proxy (formerly middleware.ts); refreshes
                          session cookies and gates the (app)/(admin) groups
types/                    database.types.ts (Supabase-generated), domain.ts
```

## Deployment

The intended target is Vercel + Supabase Cloud. After `vercel link`, set the
same env vars from `.env.local.example` as project secrets (mark
`SUPABASE_SERVICE_ROLE_KEY` and `IP_HASH_SALT` as encrypted/server-only).
