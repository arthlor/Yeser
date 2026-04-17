-- fix_03_update_mood_analytics_range.sql
--
-- Replaces get_mood_analytics so that '15d', '30d', '90d' each map to the
-- correct start date. Previous installed version mishandled '15d' (it fell
-- through the else branch and returned 30-day data). This is the canonical
-- definition; kept in sync with manual_supabase_07.

create or replace function public.get_mood_analytics(p_range text default '30d'::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_start_date date;
  v_payload jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  v_start_date := case p_range
    when '15d' then current_date - interval '15 days'
    when '30d' then current_date - interval '30 days'
    when '90d' then current_date - interval '90 days'
    else current_date - interval '30 days'
  end::date;

  with entries as (
    select *
    from gratitude_entries
    where user_id = v_user_id
      and entry_date >= v_start_date
  ),
  statements as (
    select
      e.entry_date,
      elem.ordinality - 1 as idx,
      trim(elem.value::text) as statement
    from entries e
    left join lateral jsonb_array_elements_text(e.statements) with ordinality as elem(value, ordinality) on true
  ),
  moods as (
    select
      e.entry_date,
      (m.key)::int as idx,
      nullif(m.value::text, '') as mood
    from entries e
    left join lateral jsonb_each_text(e.moods) as m(key, value) on true
  ),
  statements_with_mood as (
    select
      s.entry_date,
      s.idx,
      s.statement,
      m.mood
    from statements s
    left join moods m
      on m.entry_date = s.entry_date
     and m.idx = s.idx
  ),
  mood_totals as (
    select mood, count(*)::int as total
    from moods
    where mood is not null
    group by mood
  ),
  overall_counts as (
    select
      coalesce(sum(total), 0)::int as total_sum,
      coalesce(max(total), 0)::int as max_total
    from mood_totals
  ),
  dominant_mood as (
    select mood
    from mood_totals
    order by total desc, mood asc
    limit 1
  ),
  mood_distribution as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'mood', sub.mood,
          'count', sub.total,
          'percentage',
            case when sub.total_sum = 0 then 0
                 else round(sub.total::numeric * 100 / sub.total_sum, 2)
            end
        )
        order by sub.total desc, sub.mood asc
      ),
      '[]'::jsonb
    ) as data
    from (
      select mt.mood, mt.total, oc.total_sum
      from mood_totals mt
      cross join overall_counts oc
    ) sub
  ),
  trend_data as (
    select jsonb_agg(
      jsonb_build_object(
        'date', entry_date,
        'entry_count', entry_count,
        'dominant_mood', dominant_mood,
        'mood_counts', mood_counts
      )
      order by entry_date desc
    ) as data
    from (
      select
        e.entry_date,
        coalesce(count(sw.statement) filter (where sw.statement <> ''), 0)::int as entry_count,
        (
          select mood
          from moods md
          where md.entry_date = e.entry_date and md.mood is not null
          group by mood
          order by count(*) desc, mood asc
          limit 1
        ) as dominant_mood,
        (
          select jsonb_object_agg(mood, mood_count)
          from (
            select mood, count(*)::int as mood_count
            from moods md2
            where md2.entry_date = e.entry_date and md2.mood is not null
            group by mood
          ) mm
        ) as mood_counts
      from entries e
      left join statements_with_mood sw on sw.entry_date = e.entry_date
      group by e.entry_date
    ) trend
  ),
  highlights as (
    select jsonb_agg(item order by item->>'entry_date' desc, item->>'weight' desc) as data
    from (
      select jsonb_build_object(
        'entry_date', sw.entry_date,
        'statement', sw.statement,
        'mood', sw.mood,
        'weight', round(greatest(1, least(5, char_length(sw.statement)::numeric / 60)), 2)
      ) as item
      from statements_with_mood sw
      where sw.mood is not null and sw.statement is not null and sw.statement <> ''
      order by sw.entry_date desc, char_length(sw.statement) desc
      limit 6
    ) ranked
  ),
  overview_stats as (
    select
      coalesce((select count(*) from entries), 0)::int as total_entries,
      coalesce(
        (select count(*) from statements_with_mood where statement is not null and statement <> ''),
        0
      )::int as analyzed_statements
  ),
  narrative as (
    select jsonb_build_object(
      'logical',
        case
          when oc.total_sum = 0 then 'Add more moods to see detailed insights.'
          when oc.max_total::numeric / nullif(oc.total_sum, 0) > 0.65 then
            'A single mood is appearing very frequently in this period.'
          else
            'Your gratitude moods are cycling through a healthy mix.'
        end,
      'emotional',
        case
          when dm.mood is null then
            'There is not enough mood data yet for an emotional read.'
          else
            'Recent entries feel predominantly ' || dm.mood || '.'
        end,
      'suggestions', to_jsonb(array_remove(array[
        case when oc.total_sum = 0 then
          'Tag a few gratitudes with moods to unlock deeper reflections.'
        else null end,
        case when oc.total_sum > 0 and oc.max_total::numeric / nullif(oc.total_sum, 0) > 0.65 then
          'Balance your practice by exploring a different feeling tomorrow.'
        else null end,
        'Revisit your streak card to keep the habit alive.'
      ], null))
    ) as data
    from overall_counts oc
    left join dominant_mood dm on true
  )
  select jsonb_build_object(
    'generated_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'overview', jsonb_build_object(
      'total_entries', os.total_entries,
      'analyzed_statements', os.analyzed_statements,
      'dominant_mood', dm.mood,
      'balance_score', jsonb_build_object(
        'value',
          case
            when oc.total_sum = 0 then 0
            else round(100 - (oc.max_total::numeric * 100 / oc.total_sum), 2)
          end,
        'label',
          case
            when oc.total_sum = 0 then 'neutral'
            when oc.max_total::numeric / oc.total_sum >= 0.65 then 'imbalanced'
            when oc.max_total::numeric / oc.total_sum <= 0.4 then 'balanced'
            else 'neutral'
          end
      )
    ),
    'mood_counts', md.data,
    'trend', coalesce(td.data, '[]'::jsonb),
    'highlighted_statements', coalesce(h.data, '[]'::jsonb),
    'narrative', coalesce(n.data, '{}'::jsonb)
  )
  into v_payload
  from overview_stats os
  cross join overall_counts oc
  left join dominant_mood dm on true
  left join mood_distribution md on true
  left join trend_data td on true
  left join highlights h on true
  left join narrative n on true;

  return coalesce(
    v_payload,
    jsonb_build_object(
      'generated_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'overview', jsonb_build_object(
        'total_entries', 0,
        'analyzed_statements', 0,
        'dominant_mood', null,
        'balance_score', jsonb_build_object('value', 0, 'label', 'neutral')
      ),
      'mood_counts', '[]'::jsonb,
      'trend', '[]'::jsonb,
      'highlighted_statements', '[]'::jsonb,
      'narrative', jsonb_build_object(
        'logical', 'Add more moods to see detailed insights.',
        'emotional', 'There is not enough mood data yet for an emotional read.',
        'suggestions', '[]'::jsonb
      )
    )
  );
end;
$function$;

grant execute on function public.get_mood_analytics(text) to authenticated;

notify pgrst, 'reload schema';
