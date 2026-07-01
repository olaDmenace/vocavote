-- The published_results view was security_invoker=true, so each viewer only saw
-- votes they were allowed to read (their own) — making results show 0% to
-- everyone but the voter. The view exposes only aggregate counts for elections
-- that are already closed + published, so it is safe to run as the view owner
-- (bypassing votes RLS) to aggregate all votes.
alter view public.published_results set (security_invoker = false);
