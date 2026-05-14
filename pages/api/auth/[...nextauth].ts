import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabase";
import { findUserByEmail } from "@/lib/auth-users";
import type { Role } from "@/lib/auth-users";
import bcrypt from "bcryptjs";

const HOME_BY_ROLE: Record<Role, string> = {
  owner:    "/awq",
  admin:    "/awq",
  analyst:  "/jacqes",
  "cs-ops": "/jacqes/csops",
  caza:     "/caza-vision",
};

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // ── Primary: Supabase Auth ──────────────────────────────────────────
        const { data, error } = await supabase.auth.signInWithPassword({
          email:    credentials.email,
          password: credentials.password,
        });

        if (!error && data.user) {
          const meta  = data.user.user_metadata ?? {};
          const role  = (meta.role  as Role)   ?? "analyst";
          const name  = (meta.name  as string) ?? data.user.email ?? "";
          return { id: data.user.id, name, email: data.user.email!, role };
        }

        // ── Fallback: local bcrypt list (migration period only) ─────────────
        const localUser = findUserByEmail(credentials.email);
        if (!localUser) return null;
        const valid = await bcrypt.compare(credentials.password, localUser.passwordHash);
        if (!valid) return null;
        return {
          id:    localUser.id,
          name:  localUser.name,
          email: localUser.email,
          role:  localUser.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id   = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id     = token.id   as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages:   { signIn: "/login" },
  session: { strategy: "jwt" },
});
