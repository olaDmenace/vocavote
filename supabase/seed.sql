-- Seed data for VocaVote / oau-evote-social.
--
-- Run this AFTER all schema migrations are applied. Works against either a
-- local supabase stack (`supabase db reset` picks it up) or a remote project
-- via `supabase db execute` / MCP `execute_sql`.
--
-- What it creates
-- ---------------
--  * 1 admin user (matric ADM/2026/001, password Admin#1234)
--  * 50 student users (matric CSC/2019/001..050, password Student#1234)
--  * 1 live election "OAU SUG Election 2026" with 3 positions
--    (President, Vice President, General Secretary)
--  * 6 approved candidates (2 per position) drawn from CSC/2019/001..006
--
-- Why this looks the way it does
-- ------------------------------
-- Inserting straight into auth.users is normally discouraged in favour of
-- the auth admin API. We do it here because (a) we want a reproducible
-- SQL seed that works without a service-role key on the calling side, and
-- (b) for a one-off prototype it's the smallest moving part.
--
-- Two compatibility quirks the GoTrue Go service requires that the typical
-- "INSERT INTO auth.users" doesn't make obvious:
--
--   1. auth.identities must have a matching row for each user with
--      provider='email'. signInWithPassword fails silently if it's missing.
--
--   2. The string token columns (confirmation_token, recovery_token, etc.)
--      cannot be NULL — GoTrue's Go driver scans them as plain string.
--      Set them to '' on insert.

create extension if not exists pgcrypto;

-- 1. Users (admin + 50 students)
do $$
declare
  v_admin_id uuid := gen_random_uuid();
  v_student_id uuid;
  i int;
  v_matric text;
  v_email  text;
  v_full   text;
  v_dept   text;
  v_fac    text;
  v_level  text;
  v_departments text[] := array[
    'Computer Science and Engineering','Electronic and Electrical Engineering',
    'Mechanical Engineering','Civil Engineering','Chemical Engineering',
    'Mathematics','Physics','Chemistry','Economics','Political Science'
  ];
  v_levels text[] := array['100','200','300','400','500'];
begin
  if not exists (select 1 from auth.users where email = 'adm-2026-001@student.oauife.edu.ng') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, is_sso_user, is_anonymous,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, phone_change, phone_change_token,
      email_change_token_current, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
      'adm-2026-001@student.oauife.edu.ng',
      crypt('Admin#1234', gen_salt('bf')),
      now(),
      jsonb_build_object('provider','email','providers',array['email']),
      jsonb_build_object(
        'matric_no','ADM/2026/001',
        'full_name','Adetola Adeyemi (Admin)',
        'department','Electoral Committee',
        'faculty','Student Union',
        'level','500'
      ),
      now(), now(), false, false,
      '', '', '', '', '', '', '', ''
    );
    update public.profiles set role = 'admin' where id = v_admin_id;
  end if;

  for i in 1..50 loop
    v_matric := format('CSC/2019/%s', lpad(i::text, 3, '0'));
    v_email  := format('csc-2019-%s@student.oauife.edu.ng', lpad(i::text, 3, '0'));
    v_full   := format('Student %s', lpad(i::text, 3, '0'));
    v_dept   := v_departments[1 + (i % array_length(v_departments, 1))];
    v_fac    := 'Technology';
    v_level  := v_levels[1 + (i % array_length(v_levels, 1))];

    if not exists (select 1 from auth.users where email = v_email) then
      v_student_id := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, is_sso_user, is_anonymous,
        confirmation_token, recovery_token, email_change_token_new,
        email_change, phone_change, phone_change_token,
        email_change_token_current, reauthentication_token
      ) values (
        '00000000-0000-0000-0000-000000000000', v_student_id, 'authenticated', 'authenticated',
        v_email,
        crypt('Student#1234', gen_salt('bf')),
        now(),
        jsonb_build_object('provider','email','providers',array['email']),
        jsonb_build_object(
          'matric_no', v_matric,
          'full_name', v_full,
          'department', v_dept,
          'faculty', v_fac,
          'level', v_level
        ),
        now(), now(), false, false,
        '', '', '', '', '', '', '', ''
      );
    end if;
  end loop;
end $$;

-- 2. auth.identities backfill (GoTrue lookup target)
insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  u.id,
  u.id::text,
  'email',
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  now(), now(), now()
from auth.users u
left join auth.identities i on i.user_id = u.id and i.provider = 'email'
where i.id is null
  and u.email like '%@student.oauife.edu.ng';

-- 3. Election, positions, candidates
do $$
declare
  v_admin_id uuid;
  v_election_id bigint;
  v_pos_pres bigint;
  v_pos_vp bigint;
  v_pos_sec bigint;
  v_student_ids uuid[];
begin
  select id into v_admin_id from public.profiles where role = 'admin' limit 1;

  if not exists (select 1 from public.elections where title = 'OAU SUG Election 2026') then
    insert into public.elections (title, description, status, start_at, end_at, created_by)
    values (
      'OAU SUG Election 2026',
      'Annual Student Union Government election. Three positions are up for grabs: President, Vice President, and General Secretary.',
      'live',
      now() - interval '1 hour',
      now() + interval '7 days',
      v_admin_id
    )
    returning id into v_election_id;
  else
    select id into v_election_id from public.elections where title = 'OAU SUG Election 2026';
  end if;

  insert into public.positions (election_id, title, description, display_order)
  values
    (v_election_id, 'President',         'Head of the SUG executive council.', 1),
    (v_election_id, 'Vice President',    'Deputises the President and chairs welfare committees.', 2),
    (v_election_id, 'General Secretary', 'Maintains records and coordinates communications.', 3)
  on conflict (election_id, title) do nothing;

  select id into v_pos_pres from public.positions where election_id = v_election_id and title = 'President';
  select id into v_pos_vp   from public.positions where election_id = v_election_id and title = 'Vice President';
  select id into v_pos_sec  from public.positions where election_id = v_election_id and title = 'General Secretary';

  select array_agg(id order by matric_no) into v_student_ids
  from (
    select id, matric_no from public.profiles
    where role = 'student'
    order by matric_no
    limit 6
  ) s;

  insert into public.candidates (student_id, position_id, approved_at, approved_by)
  values
    (v_student_ids[1], v_pos_pres, now(), v_admin_id),
    (v_student_ids[2], v_pos_pres, now(), v_admin_id),
    (v_student_ids[3], v_pos_vp,   now(), v_admin_id),
    (v_student_ids[4], v_pos_vp,   now(), v_admin_id),
    (v_student_ids[5], v_pos_sec,  now(), v_admin_id),
    (v_student_ids[6], v_pos_sec,  now(), v_admin_id)
  on conflict (student_id, position_id) do nothing;
end $$;
