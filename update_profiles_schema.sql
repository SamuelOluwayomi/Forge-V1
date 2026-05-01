-- Add name, title, and bio columns to the profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS bio text;
