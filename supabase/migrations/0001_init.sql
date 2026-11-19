-- =====================================================================
-- Disaster-Shield AI — initial schema, Row Level Security and RPCs
-- Smart India Hackathon 2026 · Team Debug Decoders
--
-- Run in the Supabase SQL editor (or `supabase db push`), then run
-- supabase/seed.sql for the Chennai demonstration data.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------
do $$ begin
  create type app_role        as enum ('resident', 'official', 'rescue', 'admin');
  create type sos_status      as enum ('submitted', 'assigned', 'in_progress', 'resolved');
  create type urgency_level   as enum ('low', 'medium', 'high', 'critical');
  create type emergency_type  as enum ('trapped', 'medical', 'evacuation', 'food_water', 'electrical', 'structural', 'other');
  create type report_severity as enum ('low', 'moderate', 'severe');
  create type report_status   as enum ('reported', 'verified', 'cleared');
  create type alert_level     as enum ('yellow', 'orange', 'red');
  create type team_status     as enum ('available', 'deployed', 'off_duty');
  create type team_type       as enum ('boat', 'medical', 'fire', 'general');
  create type shelter_status  as enum ('open', 'full', 'closed');
  create type facility_type   as enum ('water', 'food', 'medical', 'first_aid', 'electricity', 'accessible', 'sanitation', 'child_care');
  create type assignment_status as enum ('active', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 9. Risk zones (localities)
-- ---------------------------------------------------------------------
create table if not exists public.risk_zones (
  id                         text primary key,
  name                       text not null,
  lat                        double precision not null,
  lng                        double precision not null,
  radius_m                   integer not null default 1200 check (radius_m > 0),
  population                 integer not null default 0 check (population >= 0),
  historical_susceptibility  numeric(3,2) not null default 0.5 check (historical_susceptibility between 0 and 1),
  elevation_m                numeric not null default 0,
  drainage_note              text not null default '',
  created_at                 timestamptz not null default now()
);

create table if not exists public.rainfall_readings (
  id               text primary key default gen_random_uuid()::text,
  zone_id          text not null references public.risk_zones(id) on delete cascade,
  recorded_at      timestamptz not null default now(),
  rainfall_24h_mm  numeric not null check (rainfall_24h_mm between 0 and 1000),
  intensity_mm_hr  numeric not null check (intensity_mm_hr between 0 and 200),
  source           text not null default 'simulated' check (source in ('simulated', 'sensor', 'imd'))
);
create index if not exists rainfall_zone_time_idx on public.rainfall_readings (zone_id, recorded_at desc);

-- ---------------------------------------------------------------------
-- 5. Rescue teams
-- ---------------------------------------------------------------------
create table if not exists public.rescue_teams (
  id            text primary key default gen_random_uuid()::text,
  name          text not null,
  agency        text not null,
  team_type     team_type not null default 'general',
  base_zone_id  text references public.risk_zones(id),
  lat           double precision not null,
  lng           double precision not null,
  members       integer not null check (members between 1 and 200),
  contact       text not null,
  status        team_status not null default 'available',
  capabilities  text[] not null default '{}',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 1. Users (profiles linked to auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text not null default '',
  phone       text not null default '',
  role        app_role not null default 'resident',
  title       text,
  zone_id     text references public.risk_zones(id),
  team_id     text references public.rescue_teams(id) on delete set null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint rescue_has_team check (role <> 'rescue' or team_id is not null)
);

-- ---------------------------------------------------------------------
-- 2. SOS requests
-- ---------------------------------------------------------------------
create sequence if not exists public.sos_reference_seq start 1100;

create table if not exists public.sos_requests (
  id                text primary key default gen_random_uuid()::text,
  reference         text not null unique default ('SOS-' || nextval('public.sos_reference_seq')),
  resident_id       uuid references public.profiles(id) on delete set null,
  name              text not null check (char_length(trim(name)) >= 2),
  phone             text not null check (phone ~ '^(\+?91[\s-]?)?[6-9][0-9]{4}[\s-]?[0-9]{5}$'),
  emergency_type    emergency_type not null,
  urgency           urgency_level not null,
  description       text not null check (char_length(trim(description)) between 10 and 600),
  people_count      integer not null default 1 check (people_count between 1 and 500),
  zone_id           text not null references public.risk_zones(id),
  landmark          text not null default '',
  lat               double precision not null,
  lng               double precision not null,
  status            sos_status not null default 'submitted',
  assigned_team_id  text references public.rescue_teams(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists sos_status_idx on public.sos_requests (status, created_at desc);
create index if not exists sos_team_idx on public.sos_requests (assigned_team_id);

create table if not exists public.sos_status_events (
  id          text primary key default gen_random_uuid()::text,
  sos_id      text not null references public.sos_requests(id) on delete cascade,
  status      sos_status not null,
  note        text not null default '',
  actor_id    uuid references public.profiles(id) on delete set null,
  actor_name  text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists sos_events_sos_idx on public.sos_status_events (sos_id, created_at);

-- ---------------------------------------------------------------------
-- 6. Rescue assignments
-- ---------------------------------------------------------------------
create table if not exists public.rescue_assignments (
  id                text primary key default gen_random_uuid()::text,
  sos_id            text not null references public.sos_requests(id) on delete cascade,
  team_id           text not null references public.rescue_teams(id) on delete cascade,
  assigned_by       uuid references public.profiles(id) on delete set null,
  assigned_by_name  text not null default '',
  assigned_at       timestamptz not null default now(),
  status            assignment_status not null default 'active',
  completed_at      timestamptz
);
create unique index if not exists one_active_assignment_per_sos
  on public.rescue_assignments (sos_id) where status = 'active';

-- ---------------------------------------------------------------------
-- 3. Flood reports
-- ---------------------------------------------------------------------
create table if not exists public.flood_reports (
  id              text primary key default gen_random_uuid()::text,
  reporter_id     uuid references public.profiles(id) on delete set null,
  reporter_name   text not null,
  contact         text,
  zone_id         text not null references public.risk_zones(id),
  road_name       text not null check (char_length(trim(road_name)) >= 3),
  description     text not null default '',
  severity        report_severity not null,
  water_depth_cm  integer check (water_depth_cm between 0 and 400),
  lat             double precision not null,
  lng             double precision not null,
  path            jsonb,
  status          report_status not null default 'reported',
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Disaster alerts
-- ---------------------------------------------------------------------
create table if not exists public.disaster_alerts (
  id              text primary key default gen_random_uuid()::text,
  title           text not null check (char_length(trim(title)) >= 5),
  message         text not null,
  level           alert_level not null,
  zone_ids        text[] not null default '{}',
  instructions    text[] not null default '{}',
  issued_at       timestamptz not null default now(),
  issued_by       uuid references public.profiles(id) on delete set null,
  issued_by_name  text not null default '',
  source          text not null default 'official' check (source in ('official', 'risk_engine')),
  active          boolean not null default true
);

-- ---------------------------------------------------------------------
-- 7. Shelters and 8. Shelter facilities
-- ---------------------------------------------------------------------
create table if not exists public.shelters (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  address     text not null,
  zone_id     text not null references public.risk_zones(id),
  lat         double precision not null,
  lng         double precision not null,
  capacity    integer not null check (capacity > 0),
  occupied    integer not null default 0 check (occupied >= 0),
  status      shelter_status not null default 'open',
  contact     text not null default '',
  updated_at  timestamptz not null default now(),
  constraint occupied_within_capacity check (occupied <= capacity)
);

create table if not exists public.shelter_facilities (
  shelter_id  text not null references public.shelters(id) on delete cascade,
  facility    facility_type not null,
  primary key (shelter_id, facility)
);

-- ---------------------------------------------------------------------
-- Activity log (dashboard feed)
-- ---------------------------------------------------------------------
create table if not exists public.activity_log (
  id          text primary key default gen_random_uuid()::text,
  type        text not null,
  message     text not null,
  zone_id     text references public.risk_zones(id),
  severity    text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  actor_id    uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- =====================================================================
-- Helper functions (SECURITY DEFINER so they can read profiles under RLS)
-- =====================================================================
create or replace function public.current_app_role()
returns app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.current_team_id()
returns text language sql stable security definer set search_path = public as $$
  select team_id from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() in ('official', 'admin'), false)
$$;

-- New auth user -> resident profile (role can only be raised by an admin)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          coalesce(new.email, ''),
          coalesce(new.raw_user_meta_data->>'phone', ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Block privilege escalation: only admins may change role / team / active
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.current_app_role()::text, '') <> 'admin' and auth.uid() is not null then
    if new.role is distinct from old.role or new.team_id is distinct from old.team_id or new.active is distinct from old.active then
      raise exception 'Only administrators can change role, team or account status';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Every new SOS gets a "submitted" timeline event
create or replace function public.sos_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  select full_name into v_name from public.profiles where id = auth.uid();
  insert into public.sos_status_events (sos_id, status, note, actor_id, actor_name)
  values (new.id, 'submitted',
          case when new.resident_id is not null then 'Request received via resident portal.' else 'Logged by control room.' end,
          auth.uid(), coalesce(v_name, new.name));
  insert into public.activity_log (type, message, zone_id, severity, actor_id)
  values ('sos', 'New SOS ' || new.reference || ' from ' || (select name from public.risk_zones where id = new.zone_id),
          new.zone_id, case when new.urgency in ('high', 'critical') then 'critical' else 'warning' end, auth.uid());
  return new;
end $$;

drop trigger if exists sos_after_insert on public.sos_requests;
create trigger sos_after_insert after insert on public.sos_requests
  for each row execute function public.sos_after_insert();

-- =====================================================================
-- RPC: assign a rescue team (officials / admins only)
-- =====================================================================
create or replace function public.assign_team(p_sos_id text, p_team_id text, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_sos   public.sos_requests;
  v_team  public.rescue_teams;
  v_name  text;
begin
  if not public.is_staff() then
    raise exception 'Not authorised: only government officials or administrators can assign teams';
  end if;
  select * into v_sos from public.sos_requests where id = p_sos_id for update;
  if not found then raise exception 'SOS request not found'; end if;
  if v_sos.status = 'resolved' then raise exception 'Request already resolved'; end if;
  select * into v_team from public.rescue_teams where id = p_team_id for update;
  if not found then raise exception 'Team not found'; end if;
  if v_team.status <> 'available' then raise exception 'Team is not available'; end if;
  select full_name into v_name from public.profiles where id = auth.uid();

  update public.rescue_assignments set status = 'cancelled', completed_at = now()
   where sos_id = p_sos_id and status = 'active';
  if v_sos.assigned_team_id is not null then
    update public.rescue_teams set status = 'available' where id = v_sos.assigned_team_id;
  end if;

  insert into public.rescue_assignments (sos_id, team_id, assigned_by, assigned_by_name)
  values (p_sos_id, p_team_id, auth.uid(), coalesce(v_name, ''));
  update public.sos_requests set status = 'assigned', assigned_team_id = p_team_id, updated_at = now() where id = p_sos_id;
  update public.rescue_teams set status = 'deployed' where id = p_team_id;
  insert into public.sos_status_events (sos_id, status, note, actor_id, actor_name)
  values (p_sos_id, 'assigned', coalesce(nullif(trim(p_note), ''), 'Assigned to ' || v_team.name || '.'), auth.uid(), coalesce(v_name, ''));
  insert into public.activity_log (type, message, zone_id, severity, actor_id)
  values ('assignment', v_team.name || ' assigned to ' || v_sos.reference, v_sos.zone_id, 'info', auth.uid());
end $$;

-- =====================================================================
-- RPC: update SOS progress (officials/admins, or the assigned rescue team)
-- =====================================================================
create or replace function public.update_sos_status(p_sos_id text, p_status sos_status, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare
  v_sos   public.sos_requests;
  v_role  app_role := public.current_app_role();
  v_name  text;
begin
  select * into v_sos from public.sos_requests where id = p_sos_id for update;
  if not found then raise exception 'SOS request not found'; end if;
  if v_role is null then raise exception 'Not authorised'; end if;
  if v_role = 'resident' then raise exception 'Not authorised'; end if;
  if v_role = 'rescue' and (v_sos.assigned_team_id is null or v_sos.assigned_team_id <> public.current_team_id()) then
    raise exception 'Rescue teams can only update requests assigned to their own team';
  end if;
  if p_status not in ('in_progress', 'resolved') then raise exception 'Invalid status transition'; end if;
  if v_sos.assigned_team_id is null then raise exception 'Assign a team first'; end if;
  if array_position(enum_range(null::sos_status), p_status) <= array_position(enum_range(null::sos_status), v_sos.status) then
    raise exception 'Status can only move forward';
  end if;
  select full_name into v_name from public.profiles where id = auth.uid();

  update public.sos_requests set status = p_status, updated_at = now() where id = p_sos_id;
  if p_status = 'resolved' then
    update public.rescue_assignments set status = 'completed', completed_at = now() where sos_id = p_sos_id and status = 'active';
    update public.rescue_teams set status = 'available' where id = v_sos.assigned_team_id;
  end if;
  insert into public.sos_status_events (sos_id, status, note, actor_id, actor_name)
  values (p_sos_id, p_status, coalesce(nullif(trim(p_note), ''), case when p_status = 'resolved' then 'Operation completed.' else 'Team on the way / on site.' end),
          auth.uid(), coalesce(v_name, ''));
  insert into public.activity_log (type, message, zone_id, severity, actor_id)
  values ('status', v_sos.reference || ' is now ' || replace(p_status::text, '_', ' '), v_sos.zone_id, 'info', auth.uid());
end $$;

-- =====================================================================
-- RPC: public SOS tracking by reference + phone (no login needed)
-- Returns only non-sensitive fields.
-- =====================================================================
create or replace function public.track_sos(p_reference text, p_phone text)
returns table (id text, reference text, status sos_status, emergency_type emergency_type, urgency urgency_level,
               zone_id text, assigned_team_id text, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select s.id, s.reference, s.status, s.emergency_type, s.urgency, s.zone_id, s.assigned_team_id, s.created_at, s.updated_at
    from public.sos_requests s
   where upper(s.reference) = upper(trim(p_reference))
     and right(regexp_replace(s.phone, '\D', '', 'g'), 10) = right(regexp_replace(p_phone, '\D', '', 'g'), 10)
   limit 1
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles            enable row level security;
alter table public.risk_zones          enable row level security;
alter table public.rainfall_readings   enable row level security;
alter table public.rescue_teams        enable row level security;
alter table public.sos_requests        enable row level security;
alter table public.sos_status_events   enable row level security;
alter table public.rescue_assignments  enable row level security;
alter table public.flood_reports       enable row level security;
alter table public.disaster_alerts     enable row level security;
alter table public.shelters            enable row level security;
alter table public.shelter_facilities  enable row level security;
alter table public.activity_log        enable row level security;

-- Profiles: users see themselves; staff see everyone; only admins edit others
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Public reference data (risk zones, rainfall, alerts, shelters) is readable by everyone
create policy zones_read on public.risk_zones for select using (true);
create policy zones_admin on public.risk_zones for all to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy rainfall_read on public.rainfall_readings for select using (true);
create policy rainfall_staff_insert on public.rainfall_readings for insert to authenticated with check (public.is_staff());

create policy alerts_read on public.disaster_alerts for select using (true);
create policy alerts_staff_insert on public.disaster_alerts for insert to authenticated with check (public.is_staff());
create policy alerts_staff_update on public.disaster_alerts for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy shelters_read on public.shelters for select using (true);
create policy shelters_admin_insert on public.shelters for insert to authenticated with check (public.current_app_role() = 'admin');
create policy shelters_admin_delete on public.shelters for delete to authenticated using (public.current_app_role() = 'admin');
create policy shelters_staff_update on public.shelters for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy facilities_read on public.shelter_facilities for select using (true);
create policy facilities_admin on public.shelter_facilities for all to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

-- Rescue teams: visible to signed-in users; admins manage; officials change availability
create policy teams_read on public.rescue_teams for select to authenticated using (true);
create policy teams_admin on public.rescue_teams for all to authenticated
  using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy teams_official_update on public.rescue_teams for update to authenticated
  using (public.current_app_role() = 'official') with check (public.current_app_role() = 'official');

-- SOS requests: residents see their own, rescue teams see their assignments, staff see all.
-- Status changes go through the assign_team / update_sos_status RPCs.
create policy sos_select on public.sos_requests for select to authenticated using (
  public.is_staff()
  or resident_id = auth.uid()
  or (public.current_app_role() = 'rescue' and assigned_team_id = public.current_team_id())
);
create policy sos_insert on public.sos_requests for insert to authenticated with check (
  status = 'submitted' and assigned_team_id is null and (
    (public.current_app_role() = 'resident' and resident_id = auth.uid())
    or (public.is_staff() and resident_id is null)
  )
);

create policy sos_events_select on public.sos_status_events for select to authenticated
  using (exists (select 1 from public.sos_requests s where s.id = sos_id));

create policy assignments_select on public.rescue_assignments for select to authenticated using (
  public.is_staff() or (public.current_app_role() = 'rescue' and team_id = public.current_team_id())
);

-- Flood reports: any signed-in user can read and report; staff verify/clear
create policy reports_read on public.flood_reports for select to authenticated using (true);
create policy reports_insert on public.flood_reports for insert to authenticated
  with check (reporter_id = auth.uid() and (status = 'reported' or public.is_staff()));
create policy reports_staff_update on public.flood_reports for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- Activity log: staff read; any signed-in user may append entries for their own actions
create policy activity_staff_read on public.activity_log for select to authenticated using (public.is_staff());
create policy activity_insert on public.activity_log for insert to authenticated with check (actor_id = auth.uid());

-- Grants for RPCs
grant execute on function public.assign_team(text, text, text) to authenticated;
grant execute on function public.update_sos_status(text, sos_status, text) to authenticated;
grant execute on function public.track_sos(text, text) to anon, authenticated;

-- =====================================================================
-- Realtime: push changes to every connected dashboard
-- =====================================================================
do $$ begin
  alter publication supabase_realtime add table
    public.sos_requests, public.sos_status_events, public.rescue_assignments, public.rescue_teams,
    public.flood_reports, public.disaster_alerts, public.shelters, public.shelter_facilities,
    public.rainfall_readings, public.activity_log, public.profiles;
exception when others then null; end $$;
