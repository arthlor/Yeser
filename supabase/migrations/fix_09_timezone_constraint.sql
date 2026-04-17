-- fix_09_timezone_constraint.sql
--
-- The current CHECK on profiles.timezone is a regex that rejects many
-- legitimate IANA zones (America/Argentina/Buenos_Aires, Asia/Ho_Chi_Minh,
-- America/St_Johns, …). Users in those zones fail push-token registration.
--
-- We drop the regex constraint and add a trigger that validates the value
-- against pg_timezone_names at write time. NULL remains allowed.

begin;

alter table public.profiles
  drop constraint if exists profiles_timezone_check;

create or replace function public.validate_profile_timezone()
returns trigger
language plpgsql
as $function$
begin
  if new.timezone is null then
    return new;
  end if;

  if not exists (
    select 1 from pg_timezone_names where name = new.timezone
  ) then
    raise exception 'Invalid IANA timezone: %', new.timezone
      using errcode = '22023';
  end if;

  return new;
end;
$function$;

drop trigger if exists validate_profile_timezone_trg on public.profiles;
create trigger validate_profile_timezone_trg
before insert or update of timezone on public.profiles
for each row execute function public.validate_profile_timezone();

notify pgrst, 'reload schema';

commit;
