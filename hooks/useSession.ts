"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { findUserByEmail } from "@/lib/auth-users";

interface SessionUser {
  name?: string;
  email?: string;
  role?: string;
}

interface Session {
  user: SessionUser;
}

export function useSession(): { data: Session | null } {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSession(null); return; }
      const appUser = findUserByEmail(user.email ?? "");
      setSession({
        user: {
          name:  appUser?.name  ?? user.email,
          email: user.email,
          role:  appUser?.role,
        },
      });
    }

    void load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { data: session };
}

export async function signOut({ callbackUrl = "/login" }: { callbackUrl?: string } = {}) {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = callbackUrl;
}
