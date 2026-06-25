-- audit_log had RLS enabled with only a SELECT policy (audit_admin_read) and no
-- INSERT policy. Every admin Server Action (moderatePost, createElection,
-- setElectionStatus, approveCandidate, moderateComment, setUserRole,
-- setUserActive, ...) inserts into audit_log via the user-scoped (authenticated)
-- client, so those inserts were silently denied by RLS. The actions don't check
-- the audit insert's error, so each action succeeded while its audit row was
-- dropped — only the cast_vote SECURITY DEFINER RPC (which bypasses RLS) ever
-- logged. This policy lets an admin write audit rows for their own actions.
create policy audit_admin_insert on public.audit_log
  for insert to authenticated
  with check (public.is_admin() and actor_id = auth.uid());
