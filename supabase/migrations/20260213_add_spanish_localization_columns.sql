-- Add Spanish localization columns for full tr/en/es support.
-- Safe to run multiple times.

alter table if exists public.daily_prompts
  add column if not exists prompt_text_es text;

alter table if exists public.gratitude_benefits
  add column if not exists title_es text;

alter table if exists public.gratitude_benefits
  add column if not exists description_es text;

alter table if exists public.gratitude_benefits
  add column if not exists stat_es text;

alter table if exists public.gratitude_benefits
  add column if not exists cta_prompt_es text;
