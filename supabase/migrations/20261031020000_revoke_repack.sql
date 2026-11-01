-- stacked passes start when the previous one ends, so a revoked pass must hand its time to the later ones
-- a refund can be processed before a retried grant, so revoked payments are remembered and the late grant arrives revoked
create table public.revoked_payments (
  stripe_payment_intent text primary key,
  revoked_at timestamptz not null default now()
);
alter table public.revoked_payments enable row level security;

create or replace function public.grant_entitlement(p_user uuid, p_session text, p_payment_intent text, p_product text, p_days int)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_start timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 0));
  if exists (select 1 from public.entitlements where stripe_session_id = p_session) then
    return;
  end if;
  select greatest(now(), coalesce(max(expires_at), now())) into v_start
  from public.entitlements
  where user_id = p_user and revoked_at is null and expires_at > now();
  insert into public.entitlements (user_id, product, starts_at, expires_at, stripe_session_id, stripe_payment_intent, revoked_at)
  values (p_user, p_product, v_start, v_start + make_interval(days => p_days), p_session, p_payment_intent,
          (select revoked_at from public.revoked_payments where stripe_payment_intent = p_payment_intent))
  on conflict (stripe_session_id) do nothing;
end;
$$;

create or replace function public.revoke_entitlement(p_payment_intent text)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_count int;
  v_user uuid;
  v_end timestamptz;
  r record;
begin
  for v_user in select distinct user_id from public.entitlements where stripe_payment_intent = p_payment_intent order by user_id loop
    perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  end loop;
  insert into public.revoked_payments (stripe_payment_intent) values (p_payment_intent) on conflict do nothing;
  update public.entitlements set revoked_at = now()
  where stripe_payment_intent = p_payment_intent and revoked_at is null;
  get diagnostics v_count = row_count;
  for v_user in select distinct user_id from public.entitlements where stripe_payment_intent = p_payment_intent loop
    select coalesce(max(expires_at), now()) into v_end from public.entitlements
    where user_id = v_user and revoked_at is null and starts_at <= now() and expires_at > now();
    -- passes only ever move earlier, keeping their length
    for r in select id, starts_at, expires_at from public.entitlements
             where user_id = v_user and revoked_at is null and starts_at > now() order by starts_at, id loop
      if r.starts_at > v_end then
        update public.entitlements set starts_at = v_end, expires_at = v_end + (r.expires_at - r.starts_at) where id = r.id;
        v_end := v_end + (r.expires_at - r.starts_at);
      else
        v_end := greatest(v_end, r.expires_at);
      end if;
    end loop;
  end loop;
  return v_count;
end;
$$;

-- end of paid time when a pass is active now, else null
create function public.access_until(p_user uuid) returns timestamptz
language sql stable security definer set search_path = ''
as $$
  select case when public.has_access(p_user) then (
    select max(expires_at) from public.entitlements where user_id = p_user and revoked_at is null and expires_at > now()
  ) end;
$$;

revoke all on function public.grant_entitlement(uuid, text, text, text, int) from public, anon, authenticated;
grant execute on function public.grant_entitlement(uuid, text, text, text, int) to service_role;
revoke all on function public.revoke_entitlement(text) from public, anon, authenticated;
grant execute on function public.revoke_entitlement(text) to service_role;
revoke all on function public.access_until(uuid) from public, anon, authenticated;
grant execute on function public.access_until(uuid) to service_role;
