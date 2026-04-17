-- fix_14_drop_profiles_timezone_check.sql
--
-- The regex CHECK on profiles.timezone is still live after fix_09 because it
-- was auto-named (Postgres picks names based on ordinal position, e.g.
-- `profiles_timezone_check1`). This script finds and drops *every* CHECK
-- on public.profiles whose expression references the `timezone` column, so
-- the dynamic IANA validation in the `validate_profile_timezone_trg` trigger
-- becomes the only source of truth.
--
-- Idempotent; running it again is a no-op.

begin;

do $$
declare
  c record;
begin
  for c in
    select conname
      from pg_constraint
      where conrelid = 'public.profiles'::regclass
        and contype  = 'c'
        and pg_get_constraintdef(oid) ilike '%timezone%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
    raise notice 'Dropped CHECK constraint: %', c.conname;
  end loop;
end;
$$;

-- Sanity check: the trigger must still be in place. fix_09 creates it.
do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'validate_profile_timezone_trg'
      and tgrelid = 'public.profiles'::regclass
  ) then
    raise exception 'validate_profile_timezone_trg trigger is missing; re-run fix_09_timezone_constraint.sql first';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
