-- A pass bought while another is active starts when that one ends. Revoking a pass (refund or dispute) now pulls
-- the user's later passes forward to close the gap, so a paid, unrefunded pass isn't stuck waiting on a revoked one.
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

-- One call for the access check: the end of the user's paid time if a pass is active now, otherwise null.
create function public.access_until(p_user uuid) returns timestamptz
language sql stable security definer set search_path = ''
as $$
  select case when public.has_access(p_user) then (
    select max(expires_at) from public.entitlements where user_id = p_user and revoked_at is null and expires_at > now()
  ) end;
$$;

revoke all on function public.revoke_entitlement(text) from public, anon, authenticated;
grant execute on function public.revoke_entitlement(text) to service_role;
revoke all on function public.access_until(uuid) from public, anon, authenticated;
grant execute on function public.access_until(uuid) to service_role;
