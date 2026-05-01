-- Add profile_sbt_mint column to store the on-chain identity token address
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_sbt_mint text;
