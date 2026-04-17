BEGIN;

DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname
    INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.ai_usage'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%feature%'
  ORDER BY oid
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.ai_usage DROP CONSTRAINT %I',
      v_constraint_name
    );
  END IF;
END;
$$;

ALTER TABLE public.ai_usage
  ADD CONSTRAINT ai_usage_feature_check
  CHECK (
    feature = ANY (
      ARRAY[
        'mood_suggest'::text,
        'entry_enhance'::text,
        'coach_prompt'::text,
        'memory_curate'::text,
        'chat_message'::text,
        'mood_insights'::text
      ]
    )
  );

COMMENT ON COLUMN public.ai_usage.feature IS
  'AI feature type: mood_suggest, entry_enhance, coach_prompt, memory_curate, chat_message, mood_insights';

COMMIT;
