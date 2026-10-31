-- Browser push: a user can have one subscription per browser. The cron sends at the same local hour as email.
alter table public.profiles add column push_enabled boolean not null default false;

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_select_own on public.push_subscriptions for select using (user_id = auth.uid());
create policy push_subscriptions_insert_own on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy push_subscriptions_delete_own on public.push_subscriptions for delete using (user_id = auth.uid());
