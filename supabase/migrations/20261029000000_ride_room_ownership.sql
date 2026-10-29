-- RideSync: make ride creator the only person allowed to control ride status.
-- Run this migration in the Supabase SQL Editor if migrations are not deployed automatically.

alter table public.ride_rooms
  add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists ride_rooms_created_by_idx
  on public.ride_rooms(created_by);

alter table public.ride_rooms enable row level security;

-- Remove permissive INSERT/UPDATE/ALL policies on this table so they cannot
-- override the owner checks below. SELECT policies are left unchanged.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ride_rooms'
      and cmd in ('INSERT', 'UPDATE', 'ALL')
  loop
    execute format('drop policy if exists %I on public.ride_rooms', policy_row.policyname);
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
