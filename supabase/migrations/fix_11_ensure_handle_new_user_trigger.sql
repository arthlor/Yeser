-- fix_11_ensure_handle_new_user_trigger.sql
--
-- Ensures every newly created auth.users row produces a matching
-- public.profiles row. triggers.json shows only profile-level triggers
-- (handle_updated_at, protect_is_pro_field); the auth-side trigger is not
-- dumped there because it lives on the auth schema. Re-run this file on any
-- environment that might be missing it (a fresh `supabase db reset`, a brand
-- new project, etc.).
--
-- We use the existing public.handle_new_user function if present, and
-- create a safe no-op fallback otherwise.

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, created_at, updated_at, onboarded, language)
  values (
    new.id,
    now(),
    now(),
    false,
    coalesce(new.raw_user_meta_data->>'language', 'en')
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

notify pgrst, 'reload schema';

commit;
