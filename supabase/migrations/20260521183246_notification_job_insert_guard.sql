-- Hard guard against duplicate notification jobs for the same user/time window.
--
-- The enqueue function now uses an advisory lock and checks all existing job
-- statuses, but this trigger protects the table even if an old/stale caller or
-- manual insert path survives. Returning null from a BEFORE INSERT trigger
-- suppresses only the duplicate row instead of failing the whole enqueue batch.

begin;

create or replace function public.suppress_duplicate_notification_job()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if exists (
    select 1
    from public.notification_jobs existing
    where existing.user_id = new.user_id
      and existing.scheduled_for = new.scheduled_for
  ) then
    return null;
  end if;

  return new;
end;
$function$;

drop trigger if exists notification_jobs_suppress_duplicate
  on public.notification_jobs;

create trigger notification_jobs_suppress_duplicate
before insert on public.notification_jobs
for each row
execute function public.suppress_duplicate_notification_job();

notify pgrst, 'reload schema';

commit;
