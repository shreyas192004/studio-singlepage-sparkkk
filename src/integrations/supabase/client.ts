import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const mainUrl = import.meta.env.VITE_MAIN_SUPABASE_URL;
const mainAnonKey = import.meta.env.VITE_MAIN_SUPABASE_ANON_KEY;

const aiUrl = import.meta.env.VITE_AI_SUPABASE_URL;
const aiAnonKey = import.meta.env.VITE_AI_SUPABASE_ANON_KEY;

if (!mainUrl || !mainAnonKey) {
  throw new Error("Main Supabase env not loaded");
}

if (!aiUrl || !aiAnonKey) {
  throw new Error("AI Supabase env not loaded");
}

export const mainSupabase = createClient<Database>(mainUrl, mainAnonKey, {
  auth: {
    storage: localStorage,
    storageKey: 'sb-main-auth-token',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export const aiSupabase = createClient<Database>(aiUrl, aiAnonKey, {
  auth: {
    storage: localStorage,
    storageKey: 'sb-ai-auth-token',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Helper for session recovery
export const clearStaleSessions = async () => {
  console.log("DEBUG: Clearing stale sessions...");
  try {
    await mainSupabase.auth.signOut();
    await aiSupabase.auth.signOut();
    localStorage.removeItem('sb-main-auth-token');
    localStorage.removeItem('sb-ai-auth-token');
    console.log("DEBUG: Sessions cleared.");
  } catch (err) {
    console.error("DEBUG: Error clearing sessions:", err);
  }
};

// Aliases for compatibility during transition
export const supabase = mainSupabase;
export const lovableSupabase = aiSupabase;