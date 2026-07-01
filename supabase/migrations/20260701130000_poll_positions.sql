-- Polls reuse the election engine: a position can be a candidate race ('candidates')
-- or a text-option poll ('poll'). A poll option is a candidates row with no
-- student and a text label (auto-approved). Votes still key off candidate_id, so
-- cast_vote/tally/results all keep working.

alter table public.positions
  add column if not exists kind text not null default 'candidates'
  check (kind in ('candidates', 'poll'));

alter table public.candidates alter column student_id drop not null;
alter table public.candidates add column if not exists label text;

alter table public.candidates drop constraint if exists candidates_student_or_label;
alter table public.candidates
  add constraint candidates_student_or_label
  check (student_id is not null or label is not null);

-- published_results: show the poll option's label when there's no student.
drop view if exists public.published_results;
create view public.published_results as
select
  v.election_id,
  v.position_id,
  p.title as position_title,
  c.id as candidate_id,
  coalesce(prof.full_name, c.label) as candidate_name,
  count(v.id)::integer as vote_count
from public.votes v
  join public.positions p on p.id = v.position_id
  join public.candidates c on c.id = v.candidate_id
  left join public.profiles prof on prof.id = c.student_id
  join public.elections e on e.id = v.election_id
where e.status = 'closed' and e.results_published = true
group by v.election_id, v.position_id, p.title, c.id, prof.full_name, c.label;

alter view public.published_results set (security_invoker = false);

create or replace function public.tally_for_election(p_election_id bigint)
 returns table(position_id bigint, position_title character varying, candidate_id bigint, candidate_name character varying, vote_count integer)
 language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select p.id::bigint, p.title, c.id::bigint,
    coalesce(prof.full_name, c.label)::varchar, coalesce(count(v.id), 0)::int
  from public.positions p
  join public.candidates c on c.position_id = p.id and c.approved_at is not null
  left join public.profiles prof on prof.id = c.student_id
  left join public.votes v on v.candidate_id = c.id
  where p.election_id = p_election_id
  group by p.id, p.title, c.id, prof.full_name, c.label, p.display_order
  order by p.display_order, p.id, vote_count desc, coalesce(prof.full_name, c.label);
end;
$function$;

create or replace function public.results_csv(p_election_id bigint)
 returns table(election_title character varying, position_title character varying, candidate_name character varying, vote_count integer)
 language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select e.title, p.title,
    coalesce(prof.full_name, c.label)::varchar, coalesce(count(v.id), 0)::int
  from public.elections e
  join public.positions p on p.election_id = e.id
  join public.candidates c on c.position_id = p.id and c.approved_at is not null
  left join public.profiles prof on prof.id = c.student_id
  left join public.votes v on v.candidate_id = c.id
  where e.id = p_election_id and e.status = 'closed' and e.results_published = true
  group by e.title, p.title, prof.full_name, c.label, p.display_order, c.id
  order by p.display_order, vote_count desc, coalesce(prof.full_name, c.label);
end;
$function$;
