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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check designer role without fetching inside callback
          setTimeout(async () => {
            const { data } = await (supabase as any)
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .eq("role", "designer")
              .maybeSingle();
            setIsDesigner(!!data);
            setLoading(false);
          }, 0);
        } else {
          setIsDesigner(false);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          const { data } = await (supabase as any)
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .eq("role", "designer")
            .maybeSingle();
          setIsDesigner(!!data);
          setLoading(false);
        }, 0);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
    setIsDesigner(false);
  };

  return (
    <DesignerContext.Provider value={{ user, session, isDesigner, loading, signIn, signOut }}>
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
