-- The trigger function must not be callable via the public REST RPC surface.
-- Triggers still fire (they run as the table owner regardless of these grants).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
