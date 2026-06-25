# Candidates Page + Admin Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `/candidates` list page, inline post moderation (Hide/Delete), comment moderation, and admin user/role management (promote/demote + suspend with full enforcement) to VocaVote.

**Architecture:** Reuse the established Server Action pattern (`ActionResult` + Zod + `audit_log` + `revalidatePath`), gated by the existing `requireAdminClient()` helper and `is_admin()` RLS policies. No schema changes — uses the existing `profiles.role` and `profiles.is_active` columns. New UI is thin: a server `/candidates` page, a small client moderation menu slotted into the existing `PostCard`, per-comment controls in `CommentThread`, and a `/users` admin page.

**Tech Stack:** Next.js 16 App Router (Server Components + Server Actions), React 19, Supabase (`@supabase/ssr`), Zod 4, Tailwind 4, Vitest 4.

---

## File Structure

New:
- `lib/auth/is-self-targeted.ts` — pure guard helper (admin can't act on self)
- `components/feed/post-moderation-menu.tsx` — client; inline Hide/Delete for a post
- `app/(app)/candidates/page.tsx` — server; candidate list grouped by position
- `app/(admin)/users/page.tsx` — server; user management table
- `app/(admin)/users/user-row.tsx` — client; per-user role/active controls
- `tests/unit/admin-validation.test.ts` — schema + helper unit tests

Modified:
- `types/domain.ts` — add `account_suspended` error
- `lib/validation/admin.ts` — add `moderateCommentSchema`, `setUserRoleSchema`, `setUserActiveSchema`
- `lib/auth/guards.ts` — enforce `is_active` in `requireProfile`
- `app/actions/auth.ts` — block suspended accounts at login
- `app/actions/admin.ts` — add `moderateComment`, `setUserRole`, `setUserActive`
- `components/feed/post-card.tsx` — add optional `actions` slot
- `components/feed/comments.tsx` — add `isAdmin` + per-comment moderation
- `app/(app)/feed/page.tsx` — pass inline moderation menu when admin
- `app/(app)/candidates/[id]/page.tsx` — pass inline menu + `isAdmin` to comments
- `app/(admin)/layout.tsx` — add "Users" nav link
- `app/(auth)/login/page.tsx` + `login-form.tsx` — suspended notice

---

## Task 1: Add `account_suspended` error code

**Files:**
- Modify: `types/domain.ts:5-15`

- [ ] **Step 1: Add the error entry**

In `types/domain.ts`, add the entry to `ACTION_ERRORS` (after `invalid_credentials`):

```ts
  invalid_credentials: { code: 'invalid_credentials', message: 'Invalid credentials.' },
  account_suspended: {
    code: 'account_suspended',
    message: 'Your account has been suspended. Contact the electoral committee.',
  },
  unknown: { code: 'unknown', message: 'Something went wrong. Please try again.' },
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add types/domain.ts
git commit -m "feat: add account_suspended action error"
```

---

## Task 2: Validation schemas (TDD)

**Files:**
- Test: `tests/unit/admin-validation.test.ts`
- Modify: `lib/validation/admin.ts:39` (append)

- [ ] **Step 1: Write the failing test**

Create `tests/unit/admin-validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  moderateCommentSchema,
  setUserRoleSchema,
  setUserActiveSchema,
} from '@/lib/validation/admin'

const UUID = '760f957c-1ded-4299-b941-35ada6b69af7'

describe('moderateCommentSchema', () => {
  it('accepts a valid hide', () => {
    const r = moderateCommentSchema.safeParse({ commentId: 5, status: 'hidden' })
    expect(r.success).toBe(true)
  })
  it('rejects a bad status', () => {
    const r = moderateCommentSchema.safeParse({ commentId: 5, status: 'nuked' })
    expect(r.success).toBe(false)
  })
  it('rejects a non-positive id', () => {
    const r = moderateCommentSchema.safeParse({ commentId: 0, status: 'active' })
    expect(r.success).toBe(false)
  })
})

describe('setUserRoleSchema', () => {
  it('accepts admin role with a uuid', () => {
    const r = setUserRoleSchema.safeParse({ userId: UUID, role: 'admin' })
    expect(r.success).toBe(true)
  })
  it('rejects a non-uuid userId', () => {
    const r = setUserRoleSchema.safeParse({ userId: 'nope', role: 'admin' })
    expect(r.success).toBe(false)
  })
  it('rejects an unknown role', () => {
    const r = setUserRoleSchema.safeParse({ userId: UUID, role: 'superuser' })
    expect(r.success).toBe(false)
  })
})

describe('setUserActiveSchema', () => {
  it('accepts a boolean isActive', () => {
    const r = setUserActiveSchema.safeParse({ userId: UUID, isActive: false })
    expect(r.success).toBe(true)
  })
  it('rejects a non-boolean isActive', () => {
    const r = setUserActiveSchema.safeParse({ userId: UUID, isActive: 'yes' })
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/admin-validation.test.ts`
Expected: FAIL — `moderateCommentSchema`/`setUserRoleSchema`/`setUserActiveSchema` are not exported.

- [ ] **Step 3: Add the schemas**

Append to `lib/validation/admin.ts`:

```ts
export const moderateCommentSchema = z.object({
  commentId: z.coerce.number().int().positive(),
  status: z.enum(['active', 'hidden', 'deleted']),
})

export const setUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['student', 'admin']),
})

export const setUserActiveSchema = z.object({
  userId: z.string().uuid(),
  isActive: z.boolean(),
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/admin-validation.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/validation/admin.ts tests/unit/admin-validation.test.ts
git commit -m "feat: add moderateComment + user-management validation schemas"
```

---

## Task 3: `isSelfTargeted` helper (TDD)

**Files:**
- Create: `lib/auth/is-self-targeted.ts`
- Test: `tests/unit/admin-validation.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/admin-validation.test.ts`:

```ts
import { isSelfTargeted } from '@/lib/auth/is-self-targeted'

describe('isSelfTargeted', () => {
  it('is true when actor equals target', () => {
    expect(isSelfTargeted(UUID, UUID)).toBe(true)
  })
  it('is false for different ids', () => {
    expect(isSelfTargeted(UUID, 'other')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/admin-validation.test.ts`
Expected: FAIL — cannot find module `@/lib/auth/is-self-targeted`.

- [ ] **Step 3: Create the helper**

Create `lib/auth/is-self-targeted.ts`:

```ts
/**
 * True when an admin action targets the acting admin's own account.
 * Used to prevent self-demotion / self-suspension lockout.
 */
export function isSelfTargeted(actorId: string, targetId: string): boolean {
  return actorId === targetId
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/admin-validation.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/is-self-targeted.ts tests/unit/admin-validation.test.ts
git commit -m "feat: add isSelfTargeted lockout helper"
```

---

## Task 4: Suspend enforcement (guards + login)

**Files:**
- Modify: `lib/auth/guards.ts:38-42`
- Modify: `app/actions/auth.ts:66-79`

- [ ] **Step 1: Enforce `is_active` in `requireProfile`**

Replace `requireProfile` in `lib/auth/guards.ts` with:

```ts
export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (!profile.is_active) {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login?suspended=1')
  }
  return profile
}
```

(`createClient` and `redirect` are already imported in this file.)

- [ ] **Step 2: Block suspended accounts in `login`**

In `app/actions/auth.ts`, replace the tail of the `login` function (from the `signInWithPassword` call to the final `return ok(...)`) with:

```ts
  const email = matricToEmail(matricNo)
  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })

  await supabase.rpc('record_login_attempt', {
    p_matric_no: matricNo,
    p_ip_hash: ipHash,
    p_success: !error,
  })

  if (error || !signInData.user) {
    return err('invalid_credentials')
  }

  // Block suspended accounts (and end the just-created session).
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active')
    .eq('id', signInData.user.id)
    .maybeSingle()
  if (profile && profile.is_active === false) {
    await supabase.auth.signOut()
    return err('account_suspended')
  }

  return ok({ next: '/feed' })
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/auth/guards.ts app/actions/auth.ts
git commit -m "feat: enforce profiles.is_active at login and on every request"
```

---

## Task 5: `moderateComment` action

**Files:**
- Modify: `app/actions/admin.ts` (imports + append action)

- [ ] **Step 1: Import the schema**

In `app/actions/admin.ts`, add `moderateCommentSchema` to the existing import from `@/lib/validation/admin`:

```ts
import {
  createCandidateSchema,
  createElectionSchema,
  createPositionSchema,
  moderateCommentSchema,
  moderatePostSchema,
  setElectionStatusSchema,
} from '@/lib/validation/admin'
```

- [ ] **Step 2: Append the action**

At the end of `app/actions/admin.ts`:

```ts
export async function moderateComment(
  input: z.input<typeof moderateCommentSchema>,
): Promise<ActionResult> {
  const parsed = moderateCommentSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')

  const { error } = await ctx.supabase
    .from('comments')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.commentId)
  if (error) return err('unknown', error.message)

  await ctx.supabase.from('audit_log').insert({
    actor_id: ctx.user.id,
    action: `comment.moderate.${parsed.data.status}`,
    target_type: 'comments',
    target_id: parsed.data.commentId,
  })

  revalidatePath('/feed')
  return ok(undefined)
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/actions/admin.ts
git commit -m "feat: add moderateComment admin action"
```

---

## Task 6: User management actions

**Files:**
- Modify: `app/actions/admin.ts` (imports + append actions)

- [ ] **Step 1: Add imports**

Extend the validation import in `app/actions/admin.ts` to include the two new schemas, and add the helper import below the existing imports:

```ts
import {
  createCandidateSchema,
  createElectionSchema,
  createPositionSchema,
  moderateCommentSchema,
  moderatePostSchema,
  setElectionStatusSchema,
  setUserActiveSchema,
  setUserRoleSchema,
} from '@/lib/validation/admin'
import { isSelfTargeted } from '@/lib/auth/is-self-targeted'
```

- [ ] **Step 2: Append the actions**

At the end of `app/actions/admin.ts`:

```ts
export async function setUserRole(
  input: z.input<typeof setUserRoleSchema>,
): Promise<ActionResult> {
  const parsed = setUserRoleSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')
  if (isSelfTargeted(ctx.user.id, parsed.data.userId)) {
    return err('forbidden', 'You cannot change your own role.')
  }

  const { error } = await ctx.supabase
    .from('profiles')
    .update({ role: parsed.data.role, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.userId)
  if (error) return err('unknown', error.message)

  await ctx.supabase.from('audit_log').insert({
    actor_id: ctx.user.id,
    action: `user.role.${parsed.data.role}`,
    target_type: 'profiles',
    target_id: null,
    meta: { user_id: parsed.data.userId },
  })

  revalidatePath('/users')
  return ok(undefined)
}

export async function setUserActive(
  input: z.input<typeof setUserActiveSchema>,
): Promise<ActionResult> {
  const parsed = setUserActiveSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input', parsed.error.issues[0]?.message)

  const ctx = await requireAdminClient()
  if (!ctx.ok) return err('forbidden')
  if (isSelfTargeted(ctx.user.id, parsed.data.userId)) {
    return err('forbidden', 'You cannot suspend your own account.')
  }

  const { error } = await ctx.supabase
    .from('profiles')
    .update({ is_active: parsed.data.isActive, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.userId)
  if (error) return err('unknown', error.message)

  await ctx.supabase.from('audit_log').insert({
    actor_id: ctx.user.id,
    action: parsed.data.isActive ? 'user.reactivate' : 'user.suspend',
    target_type: 'profiles',
    target_id: null,
    meta: { user_id: parsed.data.userId },
  })

  revalidatePath('/users')
  return ok(undefined)
}
```

Note: `target_id` is `null` because `audit_log.target_id` is a bigint column and `profiles.id` is a uuid; the uuid goes in `meta.user_id`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Run all unit tests**

Run: `npm run test:unit`
Expected: PASS (existing + 10 new).

- [ ] **Step 5: Commit**

```bash
git add app/actions/admin.ts
git commit -m "feat: add setUserRole and setUserActive admin actions"
```

---

## Task 7: `PostModerationMenu` + `PostCard` actions slot

**Files:**
- Create: `components/feed/post-moderation-menu.tsx`
- Modify: `components/feed/post-card.tsx:23-55`

- [ ] **Step 1: Create the moderation menu**

Create `components/feed/post-moderation-menu.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { moderatePost } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'

type Props = {
  postId: number
  status: 'active' | 'hidden' | 'deleted'
}

export function PostModerationMenu({ postId, status }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function change(next: 'active' | 'hidden' | 'deleted') {
    if (next === 'deleted' && !confirm('Delete this post? It will be hidden from everyone.')) return
    setError(null)
    startTransition(async () => {
      const result = await moderatePost({ postId, status: next })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-1">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      {status === 'hidden' ? (
        <Button size="sm" variant="outline" onClick={() => change('active')} disabled={isPending}>
          Restore
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => change('hidden')} disabled={isPending}>
          Hide
        </Button>
      )}
      <Button size="sm" variant="destructive" onClick={() => change('deleted')} disabled={isPending}>
        Delete
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Add the `actions` slot to `PostCard`**

In `components/feed/post-card.tsx`, change the signature and header so admin controls render top-right. Replace lines 23-55 (the function signature through the closing `</header>`) with:

```tsx
export function PostCard({
  post,
  footer,
  actions,
}: {
  post: FeedPost
  footer?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <header className="flex items-center gap-3">
        <Avatar
          fullName={post.author.full_name}
          avatarPath={post.author.avatar_path}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/profile/${post.author.id}`}
              className="truncate font-medium text-zinc-900 hover:underline dark:text-zinc-50"
            >
              {post.author.full_name}
            </Link>
            <span className="truncate text-xs text-zinc-500">{post.author.matric_no}</span>
          </div>
          <div className="text-xs text-zinc-500">
            {formatRelative(post.created_at)}
            {post.type === 'manifesto' ? (
              <>
                {' · '}
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs font-medium uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Manifesto
                </span>
                {post.position_title ? <span> · {post.position_title}</span> : null}
              </>
            ) : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
```

(Leave the rest of the component — title, body, footer — unchanged.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/feed/post-moderation-menu.tsx components/feed/post-card.tsx
git commit -m "feat: PostCard actions slot + inline PostModerationMenu"
```

---

## Task 8: Wire inline post moderation into feed + candidate pages

**Files:**
- Modify: `app/(app)/feed/page.tsx:1-7, 98-117`
- Modify: `app/(app)/candidates/[id]/page.tsx:1-8, 151-153`

- [ ] **Step 1: Feed — import + pass `actions`**

In `app/(app)/feed/page.tsx`, add the import near the other component imports:

```ts
import { PostModerationMenu } from '@/components/feed/post-moderation-menu'
```

Then, where each post is rendered (the `posts.map(...)` returning a `<PostCard ...>`), add the `actions` prop. Replace the `<PostCard post={post} footer={...} />` usage with:

```tsx
              <PostCard
                post={post}
                actions={
                  profile.role === 'admin' ? (
                    <PostModerationMenu postId={post.id} status="active" />
                  ) : undefined
                }
                footer={
                  <Link
                    href={
                      post.candidate_id
                        ? `/candidates/${post.candidate_id}`
                        : `/profile/${post.author.id}`
                    }
                    className="text-xs font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
                  >
                    {post.candidate_id ? 'View manifesto & comments →' : 'View author →'}
                  </Link>
                }
              />
```

(`profile` is already in scope from `requireProfile()`.)

- [ ] **Step 2: Candidate page — import + pass `actions` to manifesto card**

In `app/(app)/candidates/[id]/page.tsx`, add:

```ts
import { PostModerationMenu } from '@/components/feed/post-moderation-menu'
```

Replace the manifesto render `<PostCard post={manifestoPost} />` (line ~153) with:

```tsx
            <PostCard
              post={manifestoPost}
              actions={
                viewer.role === 'admin' ? (
                  <PostModerationMenu postId={manifestoPost.id} status="active" />
                ) : undefined
              }
            />
```

(`viewer` is the `requireProfile()` result already in scope.)

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/feed/page.tsx app/(app)/candidates/[id]/page.tsx
git commit -m "feat: show inline post moderation to admins on feed and candidate pages"
```

---

## Task 9: Comment moderation UI

**Files:**
- Modify: `components/feed/comments.tsx:33-41, 135-162`
- Modify: `app/(app)/candidates/[id]/page.tsx:162-172`

- [ ] **Step 1: Add `isAdmin` prop + moderation handler to `CommentThread`**

In `components/feed/comments.tsx`, add the import at top (after the `createComment` import):

```ts
import { moderateComment } from '@/app/actions/admin'
```

Change the `Props` type and the function signature to accept `isAdmin`:

```ts
type Props = {
  postId: number
  initialComments: FeedComment[]
  viewer: ViewerProfile
  isAdmin?: boolean
}

export function CommentThread({ postId, initialComments, viewer, isAdmin = false }: Props) {
```

Inside the component body (e.g. just after the `onSubmit` function), add:

```ts
  function moderate(commentId: number) {
    if (!confirm('Delete this comment?')) return
    startTransition(async () => {
      const result = await moderateComment({ commentId, status: 'deleted' })
      if (!result.ok) {
        setError(result.error.message)
        return
      }
      setServerComments((prev) => prev.filter((c) => c.id !== commentId))
    })
  }
```

- [ ] **Step 2: Render the per-comment Delete control**

In the comments `<ul>`, replace the comment `<li>` body so admins get a Delete button. Replace the inner `<div className="min-w-0 flex-1 ...">` block's header row to include the control. Specifically, change the comment metadata row to:

```tsx
              <div className="flex items-baseline gap-2 text-xs text-zinc-500">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {c.author.full_name}
                </span>
                <span>{c.author.matric_no}</span>
                <span>·</span>
                <span>{formatRelative(c.created_at)}</span>
                {(c as OptimisticComment).pending ? (
                  <span className="italic">sending…</span>
                ) : null}
                {isAdmin && c.id > 0 && !(c as OptimisticComment).pending ? (
                  <button
                    type="button"
                    onClick={() => moderate(c.id)}
                    disabled={isPending}
                    className="ml-auto font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
```

(The `c.id > 0` guard skips optimistic comments, whose ids are negative.)

- [ ] **Step 3: Pass `isAdmin` from the candidate page**

In `app/(app)/candidates/[id]/page.tsx`, update the `<CommentThread ...>` usage to pass `isAdmin`:

```tsx
                <CommentThread
                  postId={manifestoPost.id}
                  isAdmin={viewer.role === 'admin'}
                  initialComments={manifestoComments}
                  viewer={{
                    id: viewer.id,
                    full_name: viewer.full_name,
                    matric_no: viewer.matric_no,
                    avatar_path: viewer.avatar_path,
                  }}
                />
```

- [ ] **Step 4: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/feed/comments.tsx app/(app)/candidates/[id]/page.tsx
git commit -m "feat: admin comment moderation in CommentThread"
```

---

## Task 10: `/candidates` list page

**Files:**
- Create: `app/(app)/candidates/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/(app)/candidates/page.tsx`:

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireProfile } from '@/lib/auth/guards'
import { Avatar } from '@/components/profile/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function CandidatesPage() {
  await requireProfile()
  const supabase = await createClient()

  // Prefer the live election; otherwise the most recent one.
  const { data: live } = await supabase
    .from('elections')
    .select('id, title, status')
    .eq('status', 'live')
    .maybeSingle()

  let election = live
  if (!election) {
    const { data: recent } = await supabase
      .from('elections')
      .select('id, title, status')
      .order('start_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    election = recent
  }

  if (!election) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-zinc-500">
          No election to show yet.
        </CardContent>
      </Card>
    )
  }

  const { data: positions } = await supabase
    .from('positions')
    .select(
      'id, title, description, display_order, candidates(id, approved_at, student:profiles!candidates_student_id_fkey(id, full_name, matric_no, avatar_path, department))',
    )
    .eq('election_id', election.id)
    .order('display_order')
    .order('id')

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Candidates
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{election.title}</p>
        </div>
        {election.status === 'live' ? (
          <Link
            href={`/ballot/${election.id}`}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Go to ballot
          </Link>
        ) : null}
      </header>

      {(positions ?? []).map((position) => {
        const approved = (position.candidates ?? []).filter((c) => c.approved_at !== null)
        return (
          <Card key={position.id}>
            <CardHeader>
              <CardTitle>{position.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {approved.length === 0 ? (
                <p className="text-sm text-zinc-500">No approved candidates yet.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {approved.map((c) => {
                    const student = Array.isArray(c.student) ? c.student[0] : c.student
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/candidates/${c.id}`}
                          className="flex items-center gap-3 rounded-md border border-zinc-200 p-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                        >
                          <Avatar
                            fullName={student?.full_name ?? 'Unknown'}
                            avatarPath={student?.avatar_path ?? null}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                              {student?.full_name ?? 'Unknown'}
                            </div>
                            <div className="truncate text-xs text-zinc-500">
                              {student?.matric_no}
                              {student?.department ? ` · ${student.department}` : ''}
                            </div>
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/candidates/page.tsx
git commit -m "feat: add /candidates list page grouped by position"
```

---

## Task 11: `/users` admin page

**Files:**
- Create: `app/(admin)/users/user-row.tsx`
- Create: `app/(admin)/users/page.tsx`
- Modify: `app/(admin)/layout.tsx:15-18`

- [ ] **Step 1: Create the client row**

Create `app/(admin)/users/user-row.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setUserRole, setUserActive } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'

export type UserRowData = {
  id: string
  fullName: string
  matricNo: string
  department: string
  role: 'student' | 'admin'
  isActive: boolean
  isSelf: boolean
}

export function UserRow({ user }: { user: UserRowData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(fn: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setError(null)
    startTransition(async () => {
      const result = await fn()
      if (!result.ok) {
        setError(result.error?.message ?? 'Something went wrong.')
        return
      }
      router.refresh()
    })
  }

  return (
    <tr className="align-middle">
      <td className="py-2 pr-4">
        <div className="font-medium text-zinc-900 dark:text-zinc-50">{user.fullName}</div>
        <div className="text-xs text-zinc-500">{user.matricNo}</div>
      </td>
      <td className="py-2 pr-4 text-zinc-600 dark:text-zinc-400">{user.department}</td>
      <td className="py-2 pr-4">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {user.role}
        </span>
      </td>
      <td className="py-2 pr-4">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            user.isActive
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
          }`}
        >
          {user.isActive ? 'active' : 'suspended'}
        </span>
      </td>
      <td className="py-2">
        {user.isSelf ? (
          <span className="text-xs text-zinc-400">You</span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {error ? <span className="text-xs text-red-600">{error}</span> : null}
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() =>
                run(() =>
                  setUserRole({ userId: user.id, role: user.role === 'admin' ? 'student' : 'admin' }),
                )
              }
            >
              {user.role === 'admin' ? 'Demote' : 'Promote'}
            </Button>
            <Button
              size="sm"
              variant={user.isActive ? 'destructive' : 'outline'}
              disabled={isPending}
              onClick={() => run(() => setUserActive({ userId: user.id, isActive: !user.isActive }))}
            >
              {user.isActive ? 'Suspend' : 'Reactivate'}
            </Button>
          </div>
        )}
      </td>
    </tr>
  )
}
```

- [ ] **Step 2: Create the page**

Create `app/(admin)/users/page.tsx`:

```tsx
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserRow, type UserRowData } from './user-row'

export default async function UsersPage() {
  const admin = await requireAdmin()
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, matric_no, department, role, is_active')
    .order('full_name')

  const rows: UserRowData[] = (profiles ?? []).map((p) => ({
    id: p.id,
    fullName: p.full_name,
    matricNo: p.matric_no,
    department: p.department,
    role: p.role as 'student' | 'admin',
    isActive: p.is_active,
    isSelf: p.id === admin.id,
  }))

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Users
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Promote or demote admins and suspend accounts. You cannot change your own.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
          <CardDescription>{rows.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Department</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {rows.map((u) => (
                  <UserRow key={u.id} user={u} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Add the "Users" nav link**

In `app/(admin)/layout.tsx`, add a link after the Moderation link:

```tsx
            <AdminLink href="/dashboard">Dashboard</AdminLink>
            <AdminLink href="/elections">Elections</AdminLink>
            <AdminLink href="/moderation">Moderation</AdminLink>
            <AdminLink href="/users">Users</AdminLink>
```

- [ ] **Step 4: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/(admin)/users/page.tsx app/(admin)/users/user-row.tsx app/(admin)/layout.tsx
git commit -m "feat: admin /users page with role + suspend controls"
```

---

## Task 12: Suspended notice on the login page

**Files:**
- Modify: `app/(auth)/login/page.tsx:1-26`

- [ ] **Step 1: Show the notice when `?suspended=1`**

In `app/(auth)/login/page.tsx`, import `Alert`, widen the `searchParams` type, and render the notice. Replace the top of the file through the `<CardContent>` opening with:

```tsx
import Link from 'next/link'
import { LoginForm } from './login-form'
import { Alert } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Props = {
  searchParams: Promise<{ next?: string; suspended?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, suspended } = await searchParams
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your matric number to access the platform.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {suspended ? (
          <Alert tone="error">
            Your account has been suspended. Contact the electoral committee.
          </Alert>
        ) : null}
        <LoginForm next={next} />
      </CardContent>
```

(Leave the `CardFooter` and the rest unchanged.)

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/(auth)/login/page.tsx
git commit -m "feat: show suspended notice on login when session is killed"
```

---

## Task 13: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Lint, type-check, unit tests, build**

Run: `npm run lint && npx tsc --noEmit && npm run test:unit && npm run build`
Expected: all pass; build completes.

- [ ] **Step 2: Browser walkthrough (dev server)**

Start `npm run dev`. Logged in as the seeded admin (`ADM/2026/001` — confirm the password in `supabase/seed.sql`), verify:
  - `/candidates` lists positions (President / VP / General Secretary) each with 2 approved candidates; each links to `/candidates/<id>`.
  - On `/feed`, each post shows **Hide** and **Delete** controls; Hide removes it from the active feed; the audit log at `/moderation` records `post.moderate.hidden`.
  - On a candidate page with a manifesto + comments, an admin sees **Delete** on each comment and it disappears when clicked.
  - `/users` lists everyone; **Promote** a student then **Demote** them; **Suspend** a different student.
  - Log out, log in as the suspended student → blocked with the suspended message. Suspend a student while they have an open session → their next navigation bounces to `/login?suspended=1`.
  - Confirm a non-admin student sees **no** moderation controls on feed/comments and gets redirected away from `/users`.

- [ ] **Step 3: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: address issues found during verification"
```

---

## Self-Review notes

- **Spec coverage:** /candidates (Task 10), inline Hide+Delete (Tasks 7-8), comment moderation (Tasks 5, 9), user role mgmt (Tasks 6, 11), suspend enforcement block-login+kill-sessions (Task 4), self-lockout guard (Tasks 3, 6), suspended notice (Task 12), audit logging (Tasks 5, 6), tests (Tasks 2, 3), ballot unchanged (correct — no task). All covered.
- **Type consistency:** `moderateComment`/`setUserRole`/`setUserActive` names match between admin.ts (Tasks 5,6) and their consumers (Tasks 9, 11). `PostModerationMenu` props `{postId, status}` match between Task 7 and Tasks 8. `UserRowData` shape matches between `user-row.tsx` and `page.tsx` (Task 11). `account_suspended` defined in Task 1 before use in Task 4.
- **Audit target_id:** `profiles.id` is a uuid but `audit_log.target_id` is bigint, so user-management audit rows use `target_id: null` + `meta.user_id` (noted in Task 6).
```
