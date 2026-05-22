-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ai_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL CHECK (feature = ANY (ARRAY['mood_suggest'::text, 'entry_enhance'::text, 'coach_prompt'::text, 'memory_curate'::text, 'chat_message'::text, 'mood_insights'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_usage_pkey PRIMARY KEY (id),
  CONSTRAINT ai_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.daily_prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  prompt_text_tr text NOT NULL,
  prompt_text_en text,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  prompt_text_es text,
  CONSTRAINT daily_prompts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.gratitude_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_id uuid NOT NULL,
  entry_date date NOT NULL,
  statement_index integer NOT NULL CHECK (statement_index >= 0),
  kind text NOT NULL CHECK (kind = ANY (ARRAY['image'::text, 'audio'::text])),
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  bytes integer NOT NULL CHECK (bytes > 0 AND bytes <= (16 * 1024 * 1024)),
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms > 0 AND duration_ms <= 120000),
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  transcript text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gratitude_attachments_pkey PRIMARY KEY (id),
  CONSTRAINT gratitude_attachments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT gratitude_attachments_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.gratitude_entries(id)
);
CREATE TABLE public.gratitude_benefits (
  id integer NOT NULL DEFAULT nextval('gratitude_benefits_id_seq'::regclass),
  icon text NOT NULL CHECK (char_length(icon) > 0),
  title_tr text NOT NULL CHECK (char_length(title_tr) > 0),
  description_tr text NOT NULL CHECK (char_length(description_tr) > 0),
  stat_tr text CHECK (stat_tr IS NULL OR char_length(stat_tr) > 0),
  cta_prompt_tr text CHECK (cta_prompt_tr IS NULL OR char_length(cta_prompt_tr) > 0),
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  title_en text,
  description_en text,
  stat_en text,
  cta_prompt_en text,
  title_es text,
  description_es text,
  stat_es text,
  cta_prompt_es text,
  CONSTRAINT gratitude_benefits_pkey PRIMARY KEY (id)
);
CREATE TABLE public.gratitude_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  statements jsonb NOT NULL DEFAULT '[]'::jsonb,
  moods jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT gratitude_entries_pkey PRIMARY KEY (id),
  CONSTRAINT gratitude_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.mood_insight_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  range text NOT NULL CHECK (range = ANY (ARRAY['15d'::text, '30d'::text, '90d'::text, '5e'::text, '15e'::text, '30e'::text])),
  language text NOT NULL CHECK (language = ANY (ARRAY['en'::text, 'tr'::text, 'es'::text])),
  highlighted_insight jsonb NOT NULL,
  narrative jsonb NOT NULL,
  entry_count_at_generation integer NOT NULL DEFAULT 0 CHECK (entry_count_at_generation >= 0),
  generated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  analysis_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_level text NOT NULL DEFAULT 'none'::text CHECK (risk_level = ANY (ARRAY['none'::text, 'mild_distress'::text, 'high_distress'::text, 'crisis'::text])),
  source_hash text,
  statement_count_at_generation integer NOT NULL DEFAULT 0 CHECK (statement_count_at_generation >= 0),
  range_entry_count_at_generation integer NOT NULL DEFAULT 0 CHECK (range_entry_count_at_generation >= 0),
  CONSTRAINT mood_insight_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT mood_insight_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.notification_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  tokens ARRAY NOT NULL,
  language text NOT NULL DEFAULT 'en'::text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'sent'::text, 'failed'::text])),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT notification_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.notification_logs (
  id bigint NOT NULL DEFAULT nextval('notification_logs_id_seq'::regclass),
  job_id uuid,
  token text,
  expo_status text,
  expo_message text,
  expo_ticket_id text,
  error_detail jsonb,
  delivered_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notification_logs_pkey PRIMARY KEY (id),
  CONSTRAINT notification_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.notification_jobs(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text UNIQUE,
  onboarded boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  daily_gratitude_goal integer NOT NULL DEFAULT 3 CHECK (daily_gratitude_goal >= 1 AND daily_gratitude_goal <= 20),
  use_varied_prompts boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  notification_time time without time zone CHECK (notification_time IS NULL OR (EXTRACT(minute FROM notification_time) = ANY (ARRAY[0::numeric, 30::numeric])) AND EXTRACT(second FROM notification_time) = 0::numeric),
  timezone text,
  avatar_path text,
  language text NOT NULL DEFAULT 'en'::text,
  is_pro boolean DEFAULT false,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.push_tokens (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE CHECK (token ~ '^(ExponentPushToken\[|ExpoPushToken\[|F1EAIW3EWdWQ9UPKDNVm|[a-zA-Z0-9_-]{22,}).*'::text),
  token_type text DEFAULT 'expo'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_entry_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT streaks_pkey PRIMARY KEY (id),
  CONSTRAINT streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);