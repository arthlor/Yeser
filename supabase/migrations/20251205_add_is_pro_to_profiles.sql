-- Add is_pro column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_pro ON public.profiles(is_pro);
