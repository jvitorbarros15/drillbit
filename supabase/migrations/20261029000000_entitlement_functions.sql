create function public.grant_entitlement(p_user uuid, p_session text, p_payment_intent text, p_product text, p_days int)
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
  insert into public.entitlements (user_id, product, starts_at, expires_at, stripe_session_id, stripe_payment_intent)
  values (p_user, p_product, v_start, v_start + make_interval(days => p_days), p_session, p_payment_intent)
  on conflict (stripe_session_id) do nothing;
end;
$$;

create function public.revoke_entitlement(p_payment_intent text)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_count int;
begin
  update public.entitlements set revoked_at = now()
  where stripe_payment_intent = p_payment_intent and revoked_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.grant_entitlement(uuid, text, text, text, int) from public, anon, authenticated;
revoke all on function public.revoke_entitlement(text) from public, anon, authenticated;
grant execute on function public.grant_entitlement(uuid, text, text, text, int) to service_role;
grant execute on function public.revoke_entitlement(text) to service_role;
