create table if not exists public.ride_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.ride_rooms(id) on delete cascade,
  member_id uuid not null references public.ride_members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rider_name text not null check (length(trim(rider_name)) between 1 and 80),
  body text not null check (length(trim(body)) between 1 and 500),
  message_type text not null default 'text'
    check (message_type in ('text', 'quick')),
  created_at timestamptz not null default now()
);

create index if not exists ride_messages_room_created_idx
  on public.ride_messages (room_id, created_at desc);

alter table public.ride_messages enable row level security;

grant select on public.ride_messages to authenticated;
grant insert (room_id, member_id, user_id, rider_name, body, message_type)
  on public.ride_messages to authenticated;

drop policy if exists "Ride participants can read room messages" on public.ride_messages;
create policy "Ride participants can read room messages"
on public.ride_messages
for select
to authenticated
using (private.can_access_ride_room(ride_messages.room_id));

drop policy if exists "Ride members can send room messages" on public.ride_messages;
create policy "Ride members can send room messages"
on public.ride_messages
for insert
to authenticated
with check (
  ride_messages.user_id = (select auth.uid())
  and exists (
    select 1
    from public.ride_members m
    join public.ride_rooms r on r.id = m.room_id
    where m.id = ride_messages.member_id
      and m.room_id = ride_messages.room_id
      and m.user_id = (select auth.uid())
      and m.rider_name = ride_messages.rider_name
      and r.status <> 'ended'
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ride_messages'
  ) then
    alter publication supabase_realtime add table public.ride_messages;
  end if;
end
$$;
