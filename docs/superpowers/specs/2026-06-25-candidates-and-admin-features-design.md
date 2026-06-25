# Candidates page + Admin features — Design

Date: 2026-06-25
Status: Approved (design)

## Context

VocaVote already implements Phases 0–11. During verification we found and fixed
a DB bug (`is_admin()` lacked `EXECUTE` for `authenticated`, breaking all
student reads of `posts`/`elections`/`candidates`/`comments`/`positions`). With
that fixed, the ballot correctly shows candidates again.

This work adds the four pieces the user requested:

1. The `/candidates` list page (route exists in nav but had no `page.tsx`).
2. Inline post moderation (Hide + Delete on each post where admins read them).
3. Comment moderation (action + UI; the RLS policy already exists).
4. User & role management (promote/demote admin; suspend/reactivate users).

The ballot needs **no change** — its missing-candidates symptom was the
`is_admin` bug, now resolved.

Non-goals (YAGNI): hard delete, ban reasons/appeals, pagination, bulk actions,
candidate self-nomination.

## Existing patterns reused (do not reinvent)

- Server Actions return `ActionResult` = `{ ok: true; data } | { ok: false; error: { code, message } }` (`types/domain.ts`).
- Inputs validated with Zod (`lib/validation/*`).
- Admin actions gate via the `requireAdminClient()` helper already in `app/actions/admin.ts`.
- Mutations write to `audit_log` and call `revalidatePath`.
- `moderatePost(postId, status)` already supports `active | hidden | deleted` (soft delete).
- RLS already present: `posts_admin_moderate`, `comments_admin_moderate`, `profiles_admin_write` (all `using is_admin()`).
- `profiles` already has `role` ('student'|'admin') and `is_active` (boolean) — **no schema change required**.

## A) `/candidates` list page

New `app/(app)/candidates/page.tsx` (server component).

- `requireProfile()`.
- Resolve target election: the `live` one (`.eq('status','live').maybeSingle()`);
  if none, the most recent election (by `start_at desc`) that has at least one
  approved candidate.
- Query positions for that election with embedded approved candidates — same
  embed shape as the ballot (`positions -> candidates -> profiles`,
  `manifesto:posts`). Filter `approved_at is not null` in code.
- Render grouped by position (`display_order`). Each candidate card: avatar,
  full name, matric, department, "Running for {position}" implied by grouping,
  and a link to `/candidates/{id}` ("View profile & manifesto"). If the
  candidate has a manifesto post, label the link accordingly.
- Empty states: no live/most-recent election → "No election to show yet.";
  position with zero approved candidates → "No approved candidates yet."
- Header shows the election title + a "Go to ballot" link when the election is live.

## B) Inline post moderation

- New client component `components/feed/post-moderation-menu.tsx`:
  props `{ postId, status }`; renders **Hide** (when active) and **Delete**
  (confirm dialog) buttons; calls the existing `moderatePost` action; on
  success `router.refresh()`. Mirrors `ModeratePostButtons` but trimmed to the
  inline case.
- `components/feed/post-card.tsx` (server component): add optional
  `actions?: React.ReactNode` rendered in the header's top-right. No behavior
  change when omitted.
- `app/(app)/feed/page.tsx`: it already loads `profile`. When
  `profile.role === 'admin'`, pass `<PostModerationMenu postId={post.id} status="active" />`
  as `actions` to each `PostCard`. (Feed only queries `status='active'`, so
  inline status is always active.)
- `app/(app)/candidates/[id]/page.tsx`: same — pass the menu to the manifesto
  `PostCard` when `viewer.role === 'admin'`.

## C) Comment moderation

- New Zod `moderateCommentSchema` in `lib/validation/admin.ts`:
  `{ commentId: number (int, positive), status: 'active'|'hidden'|'deleted' }`.
- New action `moderateComment` in `app/actions/admin.ts`: `requireAdminClient()`,
  update `comments.status`, write `audit_log` (`comment.moderate.{status}`),
  `revalidatePath` the post/candidate paths. Relies on `comments_admin_moderate`.
- `components/feed/comments.tsx` (`CommentThread`): add `isAdmin?: boolean` prop.
  For each rendered comment, when `isAdmin`, show a small Hide/Delete control
  that calls `moderateComment` and optimistically removes the comment from
  `serverComments`. Pass `isAdmin={viewer.role === 'admin'}` from the candidate
  page (extend the `viewer` object passed in with `role`).

## D) User & role management

- New route `app/(admin)/users/page.tsx` + add `<AdminLink href="/users">Users</AdminLink>`
  to the admin sidebar in `app/(admin)/layout.tsx`.
- Page (server component, under `(admin)` so `requireAdmin()` already gates it):
  list profiles (`id, full_name, matric_no, department, role, is_active`,
  order by `full_name`), each row with role + active badges and action buttons.
- New Zod schemas in `lib/validation/admin.ts`:
  - `setUserRoleSchema`: `{ userId: uuid, role: 'student'|'admin' }`
  - `setUserActiveSchema`: `{ userId: uuid, isActive: boolean }`
- New actions in `app/actions/admin.ts`:
  - `setUserRole`: `requireAdminClient()`; **reject if `userId === ctx.user.id`**
    (no self-demote); update `profiles.role`; audit `user.role.{role}`;
    `revalidatePath('/users')`.
  - `setUserActive`: `requireAdminClient()`; **reject if `userId === ctx.user.id`**
    (no self-suspend); update `profiles.is_active`; audit
    `user.{suspend|reactivate}`; `revalidatePath('/users')`.
  - Client `UserRow` component handles the button transitions/confirms.
- Both updates go through the admin's user-scoped client and rely on
  `profiles_admin_write`. `is_admin()` reads `profiles.role`, so a
  promote/demote takes effect on the target's next request immediately.

### Suspend enforcement (decision: block login + kill sessions)

- `app/actions/auth.ts` `login`: after a successful `signInWithPassword`, load
  the profile's `is_active`; if false, `signOut()` and return
  `err('account_suspended', 'Your account has been suspended. Contact the electoral committee.')`.
  Add `account_suspended` to the `ACTION_ERRORS` map in `types/domain.ts`.
- `lib/auth/guards.ts` `requireProfile`: if `profile.is_active === false`,
  `signOut()` then `redirect('/login?suspended=1')`. This bounces any
  already-authenticated suspended user on their next request. Because
  `requireAdmin`/most app pages call `requireProfile`, enforcement is global.
- Login page reads `?suspended=1` to show the suspended notice.

## Error handling

- All new actions return typed `ActionResult`; clients surface `error.message`
  via the existing `Alert` component.
- Delete actions confirm in the client before calling the server.
- Self-lockout attempts return `err('forbidden', ...)` with a clear message and
  the corresponding button is also disabled in the UI for the current admin's
  own row.

## Testing

- Unit (`tests/unit`): the three new Zod schemas (valid/invalid), and a small
  pure helper `isSelfTargeted(actorId, targetId)` used by the self-lockout guard.
- Manual/agent verification via the dev server + browser: admin sees inline
  Hide/Delete on feed; comment moderation hides a comment; `/users` promote +
  suspend; suspended user is bounced and cannot log in; `/candidates` lists
  approved candidates grouped by position.
- No new integration test against the DB is required for this work (existing
  cast_vote integration test stays as the DB smoke test).

## Files touched

New:
- `app/(app)/candidates/page.tsx`
- `components/feed/post-moderation-menu.tsx`
- `app/(admin)/users/page.tsx` (+ a `user-row.tsx` client component)
- `tests/unit/admin-validation.test.ts`

Modified:
- `components/feed/post-card.tsx` (add `actions` slot)
- `components/feed/comments.tsx` (add `isAdmin` + per-comment controls)
- `app/(app)/feed/page.tsx`, `app/(app)/candidates/[id]/page.tsx` (pass admin controls)
- `app/actions/admin.ts` (`moderateComment`, `setUserRole`, `setUserActive`)
- `app/actions/auth.ts` (suspend check on login)
- `lib/auth/guards.ts` (suspend enforcement in `requireProfile`)
- `lib/validation/admin.ts` (3 new schemas)
- `types/domain.ts` (`account_suspended` error)
- `app/(admin)/layout.tsx` (Users nav link)
- `app/(auth)/login/*` (suspended notice)
