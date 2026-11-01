create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  interview_date date,
  language text not null default 'js',
  progress jsonb,
  progress_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  item_id text not null,
  correct boolean not null,
  misconception_tag text,
  duration_ms integer,
  created_at timestamptz not null default now()
);
create index attempts_user_created_idx on public.attempts (user_id, created_at);

create table public.review_queue (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  item_id text not null,
  due_at date not null,
  interval_days integer not null,
  primary key (user_id, item_id)
);
comment on column public.review_queue.item_id is 'Misconception tag id, not a lesson id: the queue is per misconception.';

create table public.entitlements (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  product text not null,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  stripe_session_id text not null unique,
  stripe_payment_intent text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.review_queue enable row level security;
alter table public.entitlements enable row level security;

create policy profiles_select_own on public.profiles for select using (id = auth.uid());
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy attempts_select_own on public.attempts for select using (user_id = auth.uid());
create policy attempts_insert_own on public.attempts for insert with check (user_id = auth.uid());

create policy review_queue_select_own on public.review_queue for select using (user_id = auth.uid());
create policy review_queue_insert_own on public.review_queue for insert with check (user_id = auth.uid());
create policy review_queue_update_own on public.review_queue for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy review_queue_delete_own on public.review_queue for delete using (user_id = auth.uid());

create policy entitlements_select_own on public.entitlements for select using (user_id = auth.uid());

create function public.has_access(p_user uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.entitlements
    where user_id = p_user and revoked_at is null and starts_at <= now() and expires_at > now()
  );
$$;
revoke all on function public.has_access(uuid) from public, anon, authenticated;
grant execute on function public.has_access(uuid) to service_role;
