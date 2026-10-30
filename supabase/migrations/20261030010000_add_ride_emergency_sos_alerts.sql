create table if not exists public.ride_sos_alerts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.ride_rooms(id) on delete cascade,
  member_id uuid not null references public.ride_members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rider_name text not null check (length(trim(rider_name)) between 1 and 80),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  message text not null default 'Emergency assistance needed'
    check (length(trim(message)) between 1 and 240),
  status text not null default 'pending'
    check (status in ('pending', 'acknowledged', 'resolved')),
  created_at timestamptz not null default now(),
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz
);

create index if not exists ride_sos_alerts_room_created_idx
  on public.ride_sos_alerts (room_id, created_at desc);

create unique index if not exists ride_sos_one_open_alert_per_member
  on public.ride_sos_alerts (room_id, member_id)
  where status in ('pending', 'acknowledged');

alter table public.ride_sos_alerts enable row level security;
grant select, insert, update on public.ride_sos_alerts to authenticated;

drop policy if exists "Ride participants can view SOS alerts" on public.ride_sos_alerts;
create policy "Ride participants can view SOS alerts"
on public.ride_sos_alerts for select to authenticated
using (private.can_access_ride_room(ride_sos_alerts.room_id));

drop policy if exists "Ride members can send their own SOS alerts" on public.ride_sos_alerts;
create policy "Ride members can send their own SOS alerts"
on public.ride_sos_alerts for insert to authenticated
with check (
  ride_sos_alerts.user_id = (select auth.uid())
  and exists (
    select 1
    from public.ride_members m
    join public.ride_rooms r on r.id = m.room_id
    where m.id = ride_sos_alerts.member_id
      and m.room_id = ride_sos_alerts.room_id
      and m.user_id = (select auth.uid())
      and m.rider_name = ride_sos_alerts.rider_name
      and r.status in ('active', 'paused')
  )
);

drop policy if exists "Only ride creator can update SOS alerts" on public.ride_sos_alerts;
drop policy if exists "Only ride leader can update SOS alerts" on public.ride_sos_alerts;
create policy "Only ride leader can update SOS alerts"
on public.ride_sos_alerts for update to authenticated
using (
  exists (
    select 1 from public.ride_rooms r
    where r.id = ride_sos_alerts.room_id and r.created_by = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.ride_rooms r
    where r.id = ride_sos_alerts.room_id and r.created_by = (select auth.uid())
  )
);

create or replace function public.enforce_ride_sos_alert_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  transition_time timestamptz := clock_timestamp();
begin
  if tg_op = 'INSERT' then
    if new.status is distinct from 'pending'
      or new.acknowledged_by is not null
      or new.acknowledged_at is not null
      or new.resolved_by is not null
      or new.resolved_at is not null then
      raise check_violation using message = 'New SOS alerts must start pending without acknowledgement or resolution metadata.';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.room_id is distinct from old.room_id
    or new.member_id is distinct from old.member_id
    or new.user_id is distinct from old.user_id
    or new.rider_name is distinct from old.rider_name
    or new.latitude is distinct from old.latitude
    or new.longitude is distinct from old.longitude
    or new.message is distinct from old.message
    or new.created_at is distinct from old.created_at then
    raise insufficient_privilege using
      message = 'SOS alert details cannot be changed after creation.';
  end if;

  if auth.uid() is null then
    raise insufficient_privilege using message = 'Authentication is required.';
  end if;

  if old.status = 'pending' and new.status = 'acknowledged' then
    new.acknowledged_by := auth.uid();
    new.acknowledged_at := transition_time;
    new.resolved_by := null;
    new.resolved_at := null;
  elsif old.status in ('pending', 'acknowledged') and new.status = 'resolved' then
    new.acknowledged_by := old.acknowledged_by;
    new.acknowledged_at := old.acknowledged_at;
    new.resolved_by := auth.uid();
    new.resolved_at := transition_time;
  else
    raise check_violation using
      message = format('Invalid SOS status transition: %s -> %s', old.status, new.status);
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_ride_sos_alert_update() from public, anon, authenticated;
drop trigger if exists enforce_ride_sos_alert_update on public.ride_sos_alerts;
create trigger enforce_ride_sos_alert_update
before insert or update on public.ride_sos_alerts
for each row execute function public.enforce_ride_sos_alert_update();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ride_sos_alerts'
  ) then
    alter publication supabase_realtime add table public.ride_sos_alerts;
  end if;
end
$$;