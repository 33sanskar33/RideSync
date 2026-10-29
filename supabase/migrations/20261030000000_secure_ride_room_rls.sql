-- RideSync security hardening.
-- Link membership and location rows to Supabase Auth users so policies can
-- enforce per-user writes and room-member-only reads.
-- Existing legacy membership/location rows remain in place with user_id NULL;
-- they are not exposed by the new policies and can be cleaned up separately.

alter table public.ride_members
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.ride_locations
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create unique index if not exists ride_members_room_user_uidx
  on public.ride_members (room_id, user_id);

create unique index if not exists ride_locations_room_user_uidx
  on public.ride_locations (room_id, user_id);

alter table public.ride_rooms enable row level security;
alter table public.ride_members enable row level security;
alter table public.ride_locations enable row level security;

-- Remove old broad policies before installing the room-scoped replacements.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('ride_rooms', 'ride_members', 'ride_locations')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end $$;

create policy "Authenticated users create rooms as themselves"
  on public.ride_rooms
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "Only ride creator can update room"
  on public.ride_rooms
  for update
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "Room members and creator can view room"
  on public.ride_rooms
  for select
  to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1
      from public.ride_members m
      where m.room_id = ride_rooms.id
        and m.user_id = (select auth.uid())
    )
  );

create policy "Room members and creator can view members"
  on public.ride_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.ride_rooms r
      where r.id = ride_members.room_id
        and r.created_by = (select auth.uid())
    )
    or exists (
      select 1
      from public.ride_members mine
      where mine.room_id = ride_members.room_id
        and mine.user_id = (select auth.uid())
    )
  );

create policy "Room members and creator can view locations"
  on public.ride_locations
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.ride_rooms r
      where r.id = ride_locations.room_id
        and r.created_by = (select auth.uid())
    )
    or exists (
      select 1
      from public.ride_members mine
      where mine.room_id = ride_locations.room_id
        and mine.user_id = (select auth.uid())
    )
  );

create policy "Members can insert their own location"
  on public.ride_locations
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.ride_members m
      where m.room_id = ride_locations.room_id
        and m.user_id = (select auth.uid())
        and m.rider_name = ride_locations.rider_name
    )
    and latitude between -90 and 90
    and longitude between -180 and 180
  );

create policy "Members can update their own location"
  on public.ride_locations
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.ride_members m
      where m.room_id = ride_locations.room_id
        and m.user_id = (select auth.uid())
        and m.rider_name = ride_locations.rider_name
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.ride_members m
      where m.room_id = ride_locations.room_id
        and m.user_id = (select auth.uid())
        and m.rider_name = ride_locations.rider_name
    )
    and latitude between -90 and 90
    and longitude between -180 and 180
  );

-- Joining by code is done server-side so room codes do not require broad
-- anonymous SELECT access to every room. The caller must be authenticated.
create or replace function public.join_ride_room_by_code(
  requested_room_code text,
  requested_rider_name text
)
returns table (joined_room_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_room_id uuid;
  safe_name text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to join a ride';
  end if;

  safe_name := btrim(requested_rider_name);
  if safe_name is null or char_length(safe_name) < 1 or char_length(safe_name) > 60 then
    raise exception 'Rider name must be between 1 and 60 characters';
  end if;

  select r.id
    into target_room_id
  from public.ride_rooms r
  where upper(r.room_code) = upper(btrim(requested_room_code))
  limit 1;

  if target_room_id is null then
    return;
  end if;

  insert into public.ride_members (room_id, rider_name, user_id)
  values (target_room_id, safe_name, auth.uid())
  on conflict (room_id, user_id)
  do update set rider_name = excluded.rider_name;

  return query select target_room_id;
end;
$$;

revoke all on function public.join_ride_room_by_code(text, text) from public, anon;
grant execute on function public.join_ride_room_by_code(text, text) to authenticated;
