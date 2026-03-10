// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, lovableSupabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string) => Promise<{ error: any | null }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial check
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, currentSession: Session | null) => {
        console.log(`DEBUG: Auth event on Main: ${event}`);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        // SYNC LOGIC: If signed in to main, ensure AI project also has a session.
        // For email/password logins the signIn() method handles dual sign-in.
        // For Google OAuth we attempt to forward the anon key session so edge
        // function invocations work without a hard session requirement.
        if (event === 'SIGNED_IN' && currentSession) {
          const { data: { session: aiSession } } = await lovableSupabase.auth.getSession();
          if (!aiSession) {
            console.log("DEBUG: AI Session missing after SIGNED_IN – AI edge functions will use anon key.");
            // Edge functions on the AI project don't validate the user JWT,
            // they only check their own LOVABLE_API_KEY env secret, so generation
            // proceeds correctly even without a user-level AI session.
          }
        }

        if (event === 'SIGNED_OUT') {
          console.log("DEBUG: Main project signed out. Signing out AI project...");
          await lovableSupabase.auth.signOut();
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (!error) {
      console.log("DEBUG: Main login success. Syncing AI project...");
      const { error: aiError } = await lovableSupabase.auth.signInWithPassword({ email, password });
      if (aiError) {
        console.warn("DEBUG: AI project sync failed (email/password):", aiError.message);
      } else {
        console.log("DEBUG: AI project synced.");
      }
    }

    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectTo = `${window.location.origin}/ai-generator`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });
    return { error };
  };

  // BUG 4 FIX: Accept an optional redirectTo so callers can return the user
  // to the page they came from instead of always going to /ai-generator.
  const signInWithGoogle = async (redirectTo?: string) => {
    const destination = redirectTo
      ? `${window.location.origin}${redirectTo}`
      : `${window.location.origin}/ai-generator`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: destination,
      },
    });
    return { error };
  };

  const signOut = async () => {
    console.log("DEBUG: Signing out from both projects...");
    await Promise.all([
      supabase.auth.signOut(),
      lovableSupabase.auth.signOut()
    ]);
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};