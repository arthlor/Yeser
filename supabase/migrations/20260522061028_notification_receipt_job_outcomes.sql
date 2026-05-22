-- Keep notification_jobs aligned with terminal Expo push receipt outcomes.
--
-- The sender can only know whether Expo accepted a push ticket. This trigger
-- runs after receipt checks and makes the job status reflect APNs/FCM handoff:
-- all terminal receipt failures become failed, while mixed-token jobs remain
-- sent with last_error populated.

begin;

create or replace function public.reconcile_notification_job_receipt_status()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_job_id uuid := coalesce(new.job_id, old.job_id);
  v_total_receipts integer;
  v_pending_receipts integer;
  v_ok_receipts integer;
  v_failed_receipts integer;
  v_last_error text;
begin
  if v_job_id is null then
    return new;
  end if;

  select
    count(*) filter (where expo_ticket_id is not null),
    count(*) filter (
      where expo_ticket_id is not null
        and (receipt_checked_at is null or receipt_status is null)
    ),
    count(*) filter (where receipt_status = 'ok'),
    count(*) filter (
      where expo_ticket_id is not null
        and receipt_checked_at is not null
        and receipt_status is distinct from 'ok'
    )
  into
    v_total_receipts,
    v_pending_receipts,
    v_ok_receipts,
    v_failed_receipts
  from public.notification_logs
  where job_id = v_job_id;

  if v_total_receipts = 0
     or v_pending_receipts > 0
     or v_failed_receipts = 0 then
    return new;
  end if;

  select coalesce(
    nullif(receipt_message, ''),
    nullif(receipt_details ->> 'error', ''),
    'Expo push receipt reported delivery failure'
  )
  into v_last_error
  from public.notification_logs
  where job_id = v_job_id
    and expo_ticket_id is not null
    and receipt_checked_at is not null
    and receipt_status is distinct from 'ok'
  order by receipt_checked_at desc nulls last, delivered_at desc nulls last, id desc
  limit 1;

  if v_ok_receipts = 0 then
    update public.notification_jobs
    set
      status = 'failed',
      last_error = v_last_error,
      updated_at = now()
    where id = v_job_id
      and status is distinct from 'failed';
  else
    update public.notification_jobs
    set
      status = 'sent',
      last_error = v_last_error,
      updated_at = now()
    where id = v_job_id
      and (
        status is distinct from 'sent'
        or last_error is distinct from v_last_error
      );
  end if;

  return new;
end;
$function$;

drop trigger if exists notification_logs_reconcile_job_receipts
  on public.notification_logs;

create trigger notification_logs_reconcile_job_receipts
after insert or update of receipt_status, receipt_message, receipt_details, receipt_checked_at
on public.notification_logs
for each row
when (
  new.job_id is not null
  and new.expo_ticket_id is not null
  and new.receipt_checked_at is not null
  and new.receipt_status is not null
)
execute function public.reconcile_notification_job_receipt_status();

revoke execute on function public.reconcile_notification_job_receipt_status()
  from public, anon, authenticated;
grant execute on function public.reconcile_notification_job_receipt_status()
  to service_role;

comment on function public.reconcile_notification_job_receipt_status()
  is 'Worker-only trigger function that aligns notification job status with terminal Expo receipt outcomes.';

with receipt_rollup as (
  select
    nl.job_id,
    count(*) filter (where nl.expo_ticket_id is not null) as receipt_ticket_count,
    count(*) filter (
      where nl.expo_ticket_id is not null
        and (nl.receipt_checked_at is null or nl.receipt_status is null)
    ) as unchecked_receipts,
    count(*) filter (where nl.receipt_status = 'ok') as ok_receipts,
    count(*) filter (
      where nl.expo_ticket_id is not null
        and nl.receipt_checked_at is not null
        and nl.receipt_status is distinct from 'ok'
    ) as failed_receipts
  from public.notification_logs nl
  where nl.job_id is not null
  group by nl.job_id
),
terminal_failures as (
  select distinct on (nl.job_id)
    nl.job_id,
    coalesce(
      nullif(nl.receipt_message, ''),
      nullif(nl.receipt_details ->> 'error', ''),
      'Expo push receipt reported delivery failure'
    ) as last_error
  from public.notification_logs nl
  where nl.job_id is not null
    and nl.expo_ticket_id is not null
    and nl.receipt_checked_at is not null
    and nl.receipt_status is distinct from 'ok'
  order by nl.job_id, nl.receipt_checked_at desc nulls last, nl.delivered_at desc nulls last, nl.id desc
)
update public.notification_jobs nj
set
  status = case
    when rr.ok_receipts = 0 then 'failed'
    else 'sent'
  end,
  last_error = tf.last_error,
  updated_at = now()
from receipt_rollup rr
join terminal_failures tf on tf.job_id = rr.job_id
where nj.id = rr.job_id
  and rr.receipt_ticket_count > 0
  and rr.unchecked_receipts = 0
  and rr.failed_receipts > 0
  and (
    (rr.ok_receipts = 0 and nj.status is distinct from 'failed')
    or (
      rr.ok_receipts > 0
      and (
        nj.status is distinct from 'sent'
        or nj.last_error is distinct from tf.last_error
      )
    )
  );

notify pgrst, 'reload schema';

commit;
