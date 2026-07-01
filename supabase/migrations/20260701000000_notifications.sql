-- In-app notifications. Rows are created server-side (service role) because a
-- user's action notifies *other* users; recipients can read/mark-read/delete
-- only their own via RLS.
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  type text not null,
  post_id bigint references public.posts (id) on delete cascade,
  comment_id bigint references public.comments (id) on delete cascade,
  election_id bigint references public.elections (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (recipient_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "notifications_delete_own"
  on public.notifications for delete to authenticated
  using (recipient_id = auth.uid());

-- Deliver realtime inserts to the recipient (RLS still applies to realtime).
alter publication supabase_realtime add table public.notifications;
