"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { findUserByEmail } from "@/lib/auth-users";

type SessionUser = {
  name?: string;
  email?: string;
  role?: string;
};

type Session = { user: SessionUser } | null;

type SessionState = {
  data: Session;
  status: "loading" | "authenticated" | "unauthenticated";
};

const SessionContext = createContext<SessionState>({
  data: null,
  status: "loading",
});

export function useSupabaseSession(): SessionState {
  return useContext(SessionContext);
}

export async function supabaseSignOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/login";
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ data: null, status: "loading" });

  useEffect(() => {
    const supabase = createClient();

    const buildSession = (user: { id: string; email?: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null): SessionState => {
      if (!user) return { data: null, status: "unauthenticated" };
      const email = user.email ?? "";
      const appRole = user.app_metadata?.role as string | undefined;
      const authUser = findUserByEmail(email);
      const role = appRole ?? authUser?.role;
      const name = (user.user_metadata?.name as string | undefined) ?? authUser?.name;
      return {
        data: { user: { name, email, role } },
        status: "authenticated",
      };
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(buildSession(session?.user ?? null));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(buildSession(session?.user ?? null));
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={state}>{children}</SessionContext.Provider>
  );
}
