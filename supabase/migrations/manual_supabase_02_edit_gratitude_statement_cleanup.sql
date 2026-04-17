BEGIN;

DROP FUNCTION IF EXISTS public.edit_gratitude_statement(date, integer, text);

CREATE OR REPLACE FUNCTION public.edit_gratitude_statement(
  p_entry_date date,
  p_statement_index integer,
  p_updated_statement text,
  p_mood text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_row_id uuid;
  v_statements jsonb;
  v_moods jsonb;
  v_len int;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT id, COALESCE(statements, '[]'::jsonb), COALESCE(moods, '{}'::jsonb)
    INTO v_row_id, v_statements, v_moods
  FROM public.gratitude_entries
  WHERE user_id = v_user_id
    AND entry_date = p_entry_date
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entry not found for date %', p_entry_date USING ERRCODE = 'P0002';
  END IF;

  v_len := COALESCE(jsonb_array_length(v_statements), 0);
  IF p_statement_index < 0 OR p_statement_index >= v_len THEN
    RAISE EXCEPTION 'Invalid statement index %, length %', p_statement_index, v_len
      USING ERRCODE = '22003';
  END IF;

  UPDATE public.gratitude_entries
  SET statements = jsonb_set(
        v_statements,
        ARRAY[(p_statement_index)::text],
        to_jsonb(p_updated_statement),
        true
      ),
      moods = CASE
        WHEN p_mood IS NOT NULL THEN
          jsonb_set(v_moods, ARRAY[(p_statement_index)::text], to_jsonb(p_mood), true)
        ELSE
          v_moods
      END,
      updated_at = now()
  WHERE id = v_row_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.edit_gratitude_statement(date, integer, text, text) TO authenticated;

COMMENT ON FUNCTION public.edit_gratitude_statement(date, integer, text, text) IS
  'Edits a gratitude statement for the authenticated user and optionally updates its mood.';

NOTIFY pgrst, 'reload schema';

COMMIT;
