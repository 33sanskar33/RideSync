alter table public.ride_rooms
  add column if not exists elapsed_seconds integer not null default 0,
  add column if not exists started_at timestamptz,
  add column if not exists active_since timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists ended_at timestamptz;

alter table public.ride_rooms
  drop constraint if exists ride_rooms_elapsed_seconds_check;

alter table public.ride_rooms
  add constraint ride_rooms_elapsed_seconds_check
  check (elapsed_seconds >= 0);

-- Existing active rides start a fresh timer at migration deployment time;
-- historical duration cannot be reconstructed from the previous schema.
update public.ride_rooms
set started_at = coalesce(started_at, now()),
    active_since = coalesce(active_since, now()),
    elapsed_seconds = coalesce(elapsed_seconds, 0)
where status = 'active';

update public.ride_rooms
set elapsed_seconds = coalesce(elapsed_seconds, 0),
    active_since = null
where status <> 'active';

create or replace function public.enforce_ride_room_status_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  transition_time timestamptz := clock_timestamp();
begin
  if tg_op = 'INSERT' then
    if new.status is distinct from 'waiting' then
      raise check_violation using
        message = 'A new ride must start in waiting status.';
    end if;

    new.elapsed_seconds := 0;
    new.started_at := null;
    new.active_since := null;
    new.paused_at := null;
    new.ended_at := null;
    return new;
  end if;

  if new.status is not distinct from old.status then
    if new.elapsed_seconds is distinct from old.elapsed_seconds
      or new.started_at is distinct from old.started_at
      or new.active_since is distinct from old.active_since
      or new.paused_at is distinct from old.paused_at
      or new.ended_at is distinct from old.ended_at then
      raise insufficient_privilege using
        message = 'Ride timer values can only be changed by a valid ride status transition.';
    end if;
    return new;
  end if;

  if auth.uid() is null or auth.uid() is distinct from old.created_by then
    raise insufficient_privilege using
      message = 'Only the ride creator can change the ride status.';
  end if;

  if old.status = 'waiting' and new.status = 'active' then
    new.started_at := transition_time;
    new.active_since := transition_time;
    new.elapsed_seconds := 0;
    new.paused_at := null;
    new.ended_at := null;

  elsif old.status = 'active' and new.status = 'paused' then
    if old.active_since is null then
      raise check_violation using
        message = 'The active ride timer is missing its start timestamp.';
    end if;

    new.elapsed_seconds := old.elapsed_seconds
      + greatest(0, floor(extract(epoch from (transition_time - old.active_since)))::integer);
    new.started_at := old.started_at;
    new.active_since := null;
    new.paused_at := transition_time;
    new.ended_at := null;

  elsif old.status = 'paused' and new.status = 'active' then
    new.elapsed_seconds := old.elapsed_seconds;
    new.started_at := old.started_at;
    new.active_since := transition_time;
    new.paused_at := null;
    new.ended_at := null;

  elsif old.status = 'active' and new.status = 'ended' then
    if old.active_since is null then
      raise check_violation using
        message = 'The active ride timer is missing its start timestamp.';
    end if;

    new.elapsed_seconds := old.elapsed_seconds
      + greatest(0, floor(extract(epoch from (transition_time - old.active_since)))::integer);
    new.started_at := old.started_at;
    new.active_since := null;
    new.paused_at := null;
    new.ended_at := transition_time;

  elsif old.status = 'paused' and new.status = 'ended' then
    new.elapsed_seconds := old.elapsed_seconds;
    new.started_at := old.started_at;
    new.active_since := null;
    new.paused_at := old.paused_at;
    new.ended_at := transition_time;

  else
    raise check_violation using
      message = format('Invalid ride status transition: %s -> %s', old.status, new.status);
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_ride_room_status_transition() from public, anon, authenticated;

drop trigger if exists enforce_ride_room_status_transition on public.ride_rooms;

create trigger enforce_ride_room_status_transition
before insert or update on public.ride_rooms
for each row
execute function public.enforce_ride_room_status_transition();
