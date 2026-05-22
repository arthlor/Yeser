-- Tighten notification RPC grants.
--
-- Worker-only RPCs are called by cron/Edge Functions with service-role
-- credentials. Client token/settings RPCs remain callable by authenticated
-- users, but not by anon or the implicit public grant.

begin;

revoke execute on function public.enqueue_notification_jobs(integer)
  from public, anon, authenticated;
revoke execute on function public.lock_notification_jobs(integer, timestamp with time zone)
  from public, anon, authenticated;
revoke execute on function public.reset_stuck_notification_jobs(interval)
  from public, anon, authenticated;
revoke execute on function public.insert_notification_logs(jsonb)
  from public, anon, authenticated;

grant execute on function public.enqueue_notification_jobs(integer)
  to service_role;
grant execute on function public.lock_notification_jobs(integer, timestamp with time zone)
  to service_role;
grant execute on function public.reset_stuck_notification_jobs(interval)
  to service_role;
grant execute on function public.insert_notification_logs(jsonb)
  to service_role;

revoke execute on function public.register_push_token(text, text, text)
  from public, anon;
revoke execute on function public.unregister_push_token(text)
  from public, anon;
revoke execute on function public.set_notifications_enabled(boolean)
  from public, anon;

grant execute on function public.register_push_token(text, text, text)
  to authenticated;
grant execute on function public.unregister_push_token(text)
  to authenticated;
grant execute on function public.set_notifications_enabled(boolean)
  to authenticated;

comment on function public.enqueue_notification_jobs(integer)
  is 'Worker-only notification scheduler RPC. Execute with service_role or database owner paths only.';
comment on function public.lock_notification_jobs(integer, timestamp with time zone)
  is 'Worker-only notification job claim RPC. Execute with service_role or database owner paths only.';
comment on function public.reset_stuck_notification_jobs(interval)
  is 'Worker-only notification recovery RPC. Execute with service_role or database owner paths only.';
comment on function public.insert_notification_logs(jsonb)
  is 'Worker-only notification delivery log insert RPC. Execute with service_role or database owner paths only.';
comment on function public.register_push_token(text, text, text)
  is 'Authenticated client RPC for registering the caller push token.';
comment on function public.unregister_push_token(text)
  is 'Authenticated client RPC for unregistering the caller push token.';
comment on function public.set_notifications_enabled(boolean)
  is 'Authenticated client RPC for toggling the caller reminder setting.';

notify pgrst, 'reload schema';

commit;
