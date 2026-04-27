import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Initialize Supabase client conditionally so it doesn't crash builds if env vars are missing
export const supabase: SupabaseClient | null = 
  supabaseUrl && supabaseKey 
    ? createClient(supabaseUrl, supabaseKey) 
    : null;
