-- Adds Expo push receipt observability for APNs/FCM handoff failures.
-- Re-runnable after a partial paste: all columns/indexes/functions are guarded or replaced.

begin;

alter table public.notification_logs
  add column if not exists receipt_status text,
  add column if not exists receipt_message text,
  add column if not exists receipt_details jsonb,
  add column if not exists receipt_checked_at timestamp with time zone;

create index if not exists notification_logs_pending_receipts_idx
  on public.notification_logs (delivered_at)
  where expo_ticket_id is not null
    and receipt_checked_at is null;

create index if not exists notification_logs_receipt_status_idx
  on public.notification_logs (receipt_status)
  where receipt_status is not null;

create or replace function public.insert_notification_logs(p_logs jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  log_record jsonb;
begin
  if p_logs is null or jsonb_typeof(p_logs) <> 'array' or jsonb_array_length(p_logs) = 0 then
    return;
  end if;

  for log_record in select * from jsonb_array_elements(p_logs)
  loop
    insert into public.notification_logs (
      job_id,
      token,
      expo_status,
      expo_message,
      expo_ticket_id,
      error_detail,
      receipt_status,
      receipt_message,
      receipt_details,
      receipt_checked_at
    )
    values (
      (log_record ->> 'job_id')::uuid,
      log_record ->> 'token',
      log_record ->> 'expo_status',
      log_record ->> 'expo_message',
      log_record ->> 'expo_ticket_id',
      nullif(log_record -> 'error_detail', 'null'::jsonb),
      log_record ->> 'receipt_status',
      log_record ->> 'receipt_message',
      nullif(log_record -> 'receipt_details', 'null'::jsonb),
      case
        when log_record ? 'receipt_checked_at'
             and nullif(log_record ->> 'receipt_checked_at', '') is not null
          then (log_record ->> 'receipt_checked_at')::timestamp with time zone
        else null
      end
    );
  end loop;
end;
$function$;

revoke execute on function public.insert_notification_logs(jsonb) from public, anon, authenticated;
grant execute on function public.insert_notification_logs(jsonb) to service_role;

notify pgrst, 'reload schema';

commit;
