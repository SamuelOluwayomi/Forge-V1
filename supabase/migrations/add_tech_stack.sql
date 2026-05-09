-- Add tech_stack column to profiles table for AI-verified GitHub stack
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tech_stack TEXT;
