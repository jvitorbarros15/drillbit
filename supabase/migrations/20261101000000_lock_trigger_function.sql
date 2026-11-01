-- handle_new_user only runs as the sign-up trigger, never through the API
revoke all on function public.handle_new_user() from public, anon, authenticated;
