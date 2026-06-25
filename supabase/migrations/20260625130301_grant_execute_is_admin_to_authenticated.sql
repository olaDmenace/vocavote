-- Grant EXECUTE on is_admin() to the authenticated (and anon) roles.
--
-- public.is_admin() is SECURITY DEFINER and is referenced by the RLS SELECT
-- policies on posts, elections, candidates, comments and positions. EXECUTE was
-- only granted to postgres/service_role, so every read of those tables by a
-- normal signed-in student failed with "permission denied for function
-- is_admin" — the feed rendered empty and the live-election banner disappeared.
--
-- Safe to grant: the function only reports whether the *current* auth.uid() is
-- an admin (select exists(... where id = auth.uid() and role = 'admin')); a
-- non-admin simply gets false.

grant execute on function public.is_admin() to authenticated, anon;
