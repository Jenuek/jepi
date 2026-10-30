-- JEPI server (Supabase). Run once in the SQL editor; safe to run again.
-- Every table is protected by row level security: people only reach their own rows,
-- or the rows of a trip they are a member of.

-- 1) personal sync (plans, taste keywords, my places, encrypted AI/map keys)
create table if not exists public.jepi_docs(
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null, kind text, data jsonb, updated bigint, deleted boolean default false,
  primary key(user_id,id));
alter table public.jepi_docs enable row level security;
drop policy if exists docs_own on public.jepi_docs;
create policy docs_own on public.jepi_docs for all using (user_id=auth.uid()) with check (user_id=auth.uid());

-- 2) shared trips
create table if not exists public.jepi_trips(
  id text primary key, owner uuid not null references auth.users(id) on delete cascade,
  name text, data jsonb not null default '{}'::jsonb, rev int not null default 1, updated bigint, last_by text,
  created_at timestamptz default now());
create table if not exists public.jepi_trip_members(
  trip_id text not null references public.jepi_trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','edit','view')), name text, joined_at timestamptz default now(),
  primary key(trip_id,user_id));
create table if not exists public.jepi_trip_invites(
  code text primary key, trip_id text not null references public.jepi_trips(id) on delete cascade,
  role text not null check (role in ('edit','view')), created_by uuid default auth.uid(),
  expires_at timestamptz default now()+interval '14 days');
create table if not exists public.jepi_trip_marks(
  trip_id text not null references public.jepi_trips(id) on delete cascade, place_id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade, name text,
  created_at timestamptz default now(), primary key(trip_id,place_id,user_id));

-- my role in a trip (security definer so the member policies don't call themselves)
create or replace function public.jepi_role(t text) returns text language sql stable security definer set search_path=public as
$$ select role from public.jepi_trip_members where trip_id=t and user_id=auth.uid() $$;

alter table public.jepi_trips enable row level security;
alter table public.jepi_trip_members enable row level security;
alter table public.jepi_trip_invites enable row level security;
alter table public.jepi_trip_marks enable row level security;
drop policy if exists trips_sel on public.jepi_trips;  create policy trips_sel on public.jepi_trips for select using (public.jepi_role(id) is not null);
drop policy if exists trips_ins on public.jepi_trips;  create policy trips_ins on public.jepi_trips for insert with check (owner=auth.uid());
drop policy if exists trips_upd on public.jepi_trips;  create policy trips_upd on public.jepi_trips for update using (public.jepi_role(id) in ('owner','edit')) with check (public.jepi_role(id) in ('owner','edit'));
drop policy if exists trips_del on public.jepi_trips;  create policy trips_del on public.jepi_trips for delete using (owner=auth.uid());
drop policy if exists mem_sel on public.jepi_trip_members; create policy mem_sel on public.jepi_trip_members for select using (public.jepi_role(trip_id) is not null);
drop policy if exists mem_ins on public.jepi_trip_members; create policy mem_ins on public.jepi_trip_members for insert with check (user_id=auth.uid() and role='owner' and exists(select 1 from public.jepi_trips t where t.id=trip_id and t.owner=auth.uid()));
drop policy if exists mem_upd on public.jepi_trip_members; create policy mem_upd on public.jepi_trip_members for update using (user_id=auth.uid()) with check (user_id=auth.uid() and role=public.jepi_role(trip_id));
drop policy if exists mem_del on public.jepi_trip_members; create policy mem_del on public.jepi_trip_members for delete using (user_id=auth.uid() or public.jepi_role(trip_id)='owner');
drop policy if exists inv_ins on public.jepi_trip_invites; create policy inv_ins on public.jepi_trip_invites for insert with check (created_by=auth.uid() and public.jepi_role(trip_id) in ('owner','edit'));
drop policy if exists marks_sel on public.jepi_trip_marks; create policy marks_sel on public.jepi_trip_marks for select using (public.jepi_role(trip_id) is not null);
drop policy if exists marks_ins on public.jepi_trip_marks; create policy marks_ins on public.jepi_trip_marks for insert with check (user_id=auth.uid() and public.jepi_role(trip_id) is not null);
drop policy if exists marks_del on public.jepi_trip_marks; create policy marks_del on public.jepi_trip_marks for delete using (user_id=auth.uid());

-- join with an invite code (the only way to become a member of someone else's trip)
create or replace function public.jepi_join(p_code text, p_name text) returns text language plpgsql security definer set search_path=public as $$
declare v_trip text; v_role text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select trip_id, role into v_trip, v_role from public.jepi_trip_invites where code=p_code and expires_at>now();
  if not found then raise exception 'invite expired'; end if;
  insert into public.jepi_trip_members(trip_id,user_id,role,name) values (v_trip,auth.uid(),v_role,left(coalesce(p_name,''),30))
    on conflict (trip_id,user_id) do nothing;
  return v_trip;
end $$;
revoke all on function public.jepi_join(text,text) from public, anon;
grant execute on function public.jepi_join(text,text) to authenticated;
revoke all on function public.jepi_role(text) from public, anon;
grant execute on function public.jepi_role(text) to authenticated;

-- 3) notifications
create table if not exists public.jepi_push(
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null, sub jsonb not null, label text, updated bigint, primary key(user_id,id));
create table if not exists public.jepi_alerts(
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null, plan text, fire_at timestamptz not null, title text, body text, url text, sent_at timestamptz,
  primary key(user_id,id));
create index if not exists jepi_alerts_due on public.jepi_alerts(fire_at) where sent_at is null;
alter table public.jepi_push enable row level security;
alter table public.jepi_alerts enable row level security;
drop policy if exists push_own on public.jepi_push;   create policy push_own on public.jepi_push for all using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists alerts_own on public.jepi_alerts; create policy alerts_own on public.jepi_alerts for all using (user_id=auth.uid()) with check (user_id=auth.uid());
-- server-only secrets (VAPID keys made by the push function); no policies = no access from the app
create table if not exists public.jepi_secrets(k text primary key, v text not null);
alter table public.jepi_secrets enable row level security;

-- 4) run the push function every minute
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule(jobid) from cron.job where jobname='jepi-push';
select cron.schedule('jepi-push','* * * * *',
  $$ select net.http_post(url:='https://qjzxhcvneorbskpebvca.supabase.co/functions/v1/jepi-push',
       headers:='{"content-type":"application/json"}'::jsonb, body:='{}'::jsonb) $$);
-- old sent reminders are cleaned up once a day
select cron.unschedule(jobid) from cron.job where jobname='jepi-alerts-clean';
select cron.schedule('jepi-alerts-clean','17 4 * * *', $$ delete from public.jepi_alerts where fire_at < now() - interval '3 days' $$);

-- 5) recommendations from all travelers (👍): anyone can read the counts, people only add or remove their own.
--    Rows hold a place (name, area, position…), never who the person is beyond their account id.
create table if not exists public.jepi_recs(
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  k text not null, city text not null, entry jsonb not null, at bigint,
  primary key(user_id,k));
create index if not exists jepi_recs_city on public.jepi_recs(city);
alter table public.jepi_recs enable row level security;
drop policy if exists recs_read on public.jepi_recs;
create policy recs_read on public.jepi_recs for select using (true);
drop policy if exists recs_own on public.jepi_recs;
create policy recs_own on public.jepi_recs for insert with check (user_id=auth.uid());
drop policy if exists recs_del on public.jepi_recs;
create policy recs_del on public.jepi_recs for delete using (user_id=auth.uid());
drop policy if exists recs_upd on public.jepi_recs;
create policy recs_upd on public.jepi_recs for update using (user_id=auth.uid()) with check (user_id=auth.uid());
grant select on public.jepi_recs to anon, authenticated;
grant insert, update, delete on public.jepi_recs to authenticated;
