// ─── NextAuth options (extraído p/ uso com getServerSession em RSC) ───────────
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/auth-users";
import { verifyGuest } from "@/lib/live-shop/guests";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // 1) Usuário da Plataforma (hardcoded).
        const user = findUserByEmail(credentials.email);
        if (user) {
          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) return null;
          return { id: user.id, name: user.name, email: user.email, role: user.role };
        }

        // 2) Convidado da área da marca (DB) — role 'live-guest', escopo por marca.
        try {
          const guest = await verifyGuest(credentials.email, credentials.password);
          if (guest) {
            return {
              id: guest.id, name: guest.name, email: guest.email,
              role: "live-guest", brandGrants: guest.brandIds,
            } as any;
          }
        } catch {
          // DB indisponível → credencial inválida (fail-closed).
        }
        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
        token.brandGrants = (user as { brandGrants?: string[] }).brandGrants ?? [];
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { brandGrants?: string[] }).brandGrants = (token.brandGrants as string[]) ?? [];
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
};
