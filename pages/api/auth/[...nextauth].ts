import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { findUserByEmail, type Role } from "@/lib/auth-users";
import { createClient } from "@supabase/supabase-js";

async function signInWithSupabase(email: string, password: string) {
  // Use a fresh anon client per request (no shared session state)
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) return null;
  return data.user;
}

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const sbUser = await signInWithSupabase(credentials.email, credentials.password);
        if (!sbUser) return null;

        // Role comes from Supabase user_metadata; fall back to the static registry
        const metaRole = (sbUser.user_metadata as { role?: string })?.role as Role | undefined;
        const staticUser = findUserByEmail(credentials.email);
        const role: Role = metaRole ?? staticUser?.role ?? "analyst";
        const name = (sbUser.user_metadata as { name?: string })?.name ?? staticUser?.name ?? sbUser.email ?? "";
        const homeRoute = staticUser?.homeRoute ?? "/awq";

        return { id: sbUser.id, name, email: sbUser.email!, role, homeRoute };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
        token.homeRoute = (user as unknown as { homeRoute: string }).homeRoute;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { homeRoute?: string }).homeRoute = token.homeRoute as string;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});
