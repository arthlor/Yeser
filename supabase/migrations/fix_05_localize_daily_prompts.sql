-- fix_05_localize_daily_prompts.sql
--
-- Replaces get_random_active_prompt and get_multiple_random_active_prompts
-- with language-aware variants. The current installed version of
-- get_random_active_prompt only returns prompt_text_tr, so English/Spanish
-- users receive Turkish text.
--
-- Both new functions accept p_language ('tr' | 'en' | 'es') with sensible
-- fallbacks. The old no-arg overloads are preserved (default 'en') so an
-- older client build still works.

begin;

-- Drop legacy signatures so the returned column list can change.
drop function if exists public.get_random_active_prompt();
drop function if exists public.get_multiple_random_active_prompts(integer);

create or replace function public.get_random_active_prompt(
  p_language text default 'en'
)
returns table (
  id uuid,
  prompt_text text,
  prompt_text_tr text,
  prompt_text_en text,
  prompt_text_es text,
  category text
)
language sql
stable
set search_path to 'public'
as $function$
  select
    dp.id,
    case lower(coalesce(p_language, 'en'))
      when 'tr' then dp.prompt_text_tr
      when 'es' then coalesce(dp.prompt_text_es, dp.prompt_text_en, dp.prompt_text_tr)
      else coalesce(dp.prompt_text_en, dp.prompt_text_tr)
    end as prompt_text,
    dp.prompt_text_tr,
    dp.prompt_text_en,
    dp.prompt_text_es,
    dp.category
  from public.daily_prompts dp
  where dp.is_active = true
  order by random()
  limit 1;
$function$;

grant execute on function public.get_random_active_prompt(text) to authenticated;

create or replace function public.get_multiple_random_active_prompts(
  p_limit integer default 10,
  p_language text default 'en'
)
returns table (
  id uuid,
  prompt_text text,
  prompt_text_tr text,
  prompt_text_en text,
  prompt_text_es text,
  category text
)
language sql
stable
set search_path to 'public'
as $function$
  select
    dp.id,
    case lower(coalesce(p_language, 'en'))
      when 'tr' then dp.prompt_text_tr
      when 'es' then coalesce(dp.prompt_text_es, dp.prompt_text_en, dp.prompt_text_tr)
      else coalesce(dp.prompt_text_en, dp.prompt_text_tr)
    end as prompt_text,
    dp.prompt_text_tr,
    dp.prompt_text_en,
    dp.prompt_text_es,
    dp.category
  from public.daily_prompts dp
  where dp.is_active = true
  order by random()
  limit greatest(1, coalesce(p_limit, 10));
$function$;

grant execute on function public.get_multiple_random_active_prompts(integer, text) to authenticated;

notify pgrst, 'reload schema';

commit;
