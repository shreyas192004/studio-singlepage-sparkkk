import { createClient } from "@supabase/supabase-js";

const LOVABLE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const LOVABLE_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const lovableSupabase = createClient(
  LOVABLE_SUPABASE_URL,
  LOVABLE_SUPABASE_ANON_KEY
);
