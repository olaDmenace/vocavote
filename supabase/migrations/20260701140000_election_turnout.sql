-- Distinct-voter turnout for an election. A voter who votes across N positions
-- creates N vote rows but is still ONE voter — this returns the number of
-- distinct voters. SECURITY DEFINER so it works under students' vote RLS.
create or replace function public.election_turnout(p_election_id bigint)
returns integer
language sql
security definer
set search_path to 'public'
stable
as $function$
  select count(distinct student_id)::int from public.votes where election_id = p_election_id;
$function$;

grant execute on function public.election_turnout(bigint) to authenticated;
