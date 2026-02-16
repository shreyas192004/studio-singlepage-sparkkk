// src/contexts/DesignerContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface DesignerContextType {
  user: User | null;
  session: Session | null;
  isDesigner: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const DesignerContext = createContext<DesignerContextType | undefined>(undefined);

export const DesignerProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isDesigner, setIsDesigner] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshDesignerState = async (currentSession: Session | null) => {
    const authUser = currentSession?.user ?? null;
    setSession(currentSession);
    setUser(authUser);

    if (!authUser) {
      setIsDesigner(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("designers")
      .select("id")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (error) {
      console.error("Error checking designer status:", error);
      setIsDesigner(false);
    } else {
      setIsDesigner(!!data);
    }

    setLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      await refreshDesignerState(data.session);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      refreshDesignerState(newSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsDesigner(false);
  };

  return (
    <DesignerContext.Provider
      value={{ user, session, isDesigner, loading, signIn, signOut }}
    >
      {children}
    </DesignerContext.Provider>
  );
};

export const useDesigner = () => {
  const context = useContext(DesignerContext);
  if (context === undefined) {
    throw new Error("useDesigner must be used within a DesignerProvider");
  }
  return context;
};
