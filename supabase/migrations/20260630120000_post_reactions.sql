-- Like / dislike reactions on posts. One reaction per user per post; value is
-- +1 (like) or -1 (dislike). Switching sides updates the row; clicking the same
-- side again removes it (handled in the server action).
create table if not exists public.post_reactions (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  value smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists post_reactions_post_id_idx on public.post_reactions (post_id);

alter table public.post_reactions enable row level security;

-- Anyone signed in can read reactions (needed for aggregate counts).
create policy "post_reactions_read"
  on public.post_reactions for select to authenticated
  using (true);

-- Users may only create/update/remove their own reaction.
create policy "post_reactions_insert_self"
  on public.post_reactions for insert to authenticated
  with check (user_id = auth.uid());

create policy "post_reactions_update_self"
  on public.post_reactions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "post_reactions_delete_self"
  on public.post_reactions for delete to authenticated
  using (user_id = auth.uid());
