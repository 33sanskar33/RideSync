-- Track cumulative GPS distance per rider while a ride is active.
-- Distance is computed in the database from successive location updates.
-- Existing rows start at zero because historical GPS samples were not retained.

alter table public.ride_locations
  add column if not exists distance_meters double precision not null default 0;

alter table public.ride_locations
  drop constraint if exists ride_locations_distance_meters_nonnegative;

alter table public.ride_locations
  add constraint ride_locations_distance_meters_nonnegative
  check (distance_meters >= 0);

create or replace function private.track_ride_location_distance()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  elapsed_seconds double precision;
  segment_distance_meters double precision;
  haversine_value double precision;
  ride_is_active boolean;
begin
  if tg_op = 'INSERT' then
    new.distance_meters := 0;
    return new;
  end if;

  -- Distance is database-maintained; clients cannot submit or overwrite it.
  new.distance_meters := coalesce(old.distance_meters, 0);

  -- Ignore out-of-order GPS updates instead of moving the saved location backwards.
  if new.updated_at <= old.updated_at then
    return old;
  end if;

  if new.latitude = old.latitude and new.longitude = old.longitude then
    return new;
  end if;

  select (r.status = 'active')
    into ride_is_active
  from public.ride_rooms r
  where r.id = new.room_id;

  if ride_is_active is distinct from true then
    return new;
  end if;

  elapsed_seconds := extract(epoch from (new.updated_at - old.updated_at));

  -- Long gaps are not interpolated; the next fresh fix becomes a new baseline.
  if elapsed_seconds < 2 or elapsed_seconds > 180 then
    return new;
  end if;

  haversine_value :=
    power(sin(radians(new.latitude - old.latitude) / 2), 2)
    + cos(radians(old.latitude))
    * cos(radians(new.latitude))
    * power(sin(radians(new.longitude - old.longitude) / 2), 2);

  segment_distance_meters :=
    2 * 6371000 * asin(least(1::double precision, sqrt(greatest(0::double precision, haversine_value))));

  -- Filter stationary GPS drift and implausible teleports (over 60 m/s + 20 m).
  if segment_distance_meters < 5
     or segment_distance_meters > (60 * elapsed_seconds + 20) then
    return new;
  end if;

  new.distance_meters := coalesce(old.distance_meters, 0) + segment_distance_meters;
  return new;
end;
$function$;

revoke all on function private.track_ride_location_distance() from public, anon, authenticated;

drop trigger if exists track_ride_location_distance_before_write
  on public.ride_locations;

create trigger track_ride_location_distance_before_write
before insert or update on public.ride_locations
for each row
execute function private.track_ride_location_distance();

comment on column public.ride_locations.distance_meters is
  'Database-maintained cumulative GPS distance in metres for this rider in this ride. Existing rows start at zero because historical GPS samples were not retained.';
