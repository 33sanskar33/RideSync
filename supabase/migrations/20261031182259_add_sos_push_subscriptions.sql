create table if not exists public.ride_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ride_push_endpoint_length check (char_length(endpoint) between 1 and 2048),
  constraint ride_push_p256dh_length check (char_length(p256dh) between 1 and 256),
  constraint ride_push_auth_length check (char_length(auth) between 1 and 256)
);
create index if not exists ride_push_subscriptions_user_id_idx on public.ride_push_subscriptions(user_id);
alter table public.ride_push_subscriptions enable row level security;
revoke all on table public.ride_push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.ride_push_subscriptions to authenticated;
create policy "Users can read their own push subscriptions" on public.ride_push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their own push subscriptions" on public.ride_push_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their own push subscriptions" on public.ride_push_subscriptions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete their own push subscriptions" on public.ride_push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);
