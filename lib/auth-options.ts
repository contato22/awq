// ─── NextAuth options (extraído p/ uso com getServerSession em RSC) ───────────
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/auth-users";
import { verifyGuest } from "@/lib/live-shop/guests";
import { verifyJacqesGuest } from "@/lib/jacqes/guests";
import { clientIpFromHeaders, loginAttemptBlocked, recordLoginFailure } from "@/lib/rate-limit";

// Login com Google só liga quando GOOGLE_CLIENT_ID/SECRET existem. Entra apenas quem já é
// usuário da Plataforma (AUTH_USERS_JSON), com e-mail verificado e, se definido, do domínio
// AUTH_GOOGLE_DOMAIN. MFA/passkey/Face ID ficam a cargo da conta Google.
const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email.toLowerCase().trim();
        const ip = clientIpFromHeaders(req?.headers as { get?(name: string): string | null } | Record<string, string | string[] | undefined>);
        // Same response as a wrong password — does not reveal whether the account exists.
        if (loginAttemptBlocked(ip, email)) return null;

        const fail = () => {
          recordLoginFailure(ip, email);
          return null;
        };

        // 1) Usuário da Plataforma (hardcoded).
        const user = findUserByEmail(credentials.email);
        if (user) {
          const valid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!valid) return fail();
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

        // 3) Convidado JACQES (DB) — role 'jacqes-guest', escopo só /jacqes.
        try {
          const jg = await verifyJacqesGuest(credentials.email, credentials.password);
          if (jg) {
            return { id: jg.id, name: jg.name, email: jg.email, role: "jacqes-guest" } as any;
          }
        } catch {
          // DB indisponível → fail-closed.
        }
        return fail();
      },
    }),
    ...(googleEnabled
      ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID as string, clientSecret: process.env.GOOGLE_CLIENT_SECRET as string })]
      : []),
  ],
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const p = profile as { email?: string; email_verified?: boolean; hd?: string } | undefined;
      if (!p?.email || p.email_verified !== true) return false;
      const dominio = process.env.AUTH_GOOGLE_DOMAIN;
      if (dominio && p.hd !== dominio) return false;
      return !!findUserByEmail(p.email);
    },
    jwt({ token, user, account }) {
      if (account?.provider === "google") {
        const u = findUserByEmail(token.email ?? "");
        if (u) {
          token.id = u.id;
          token.role = u.role;
          token.brandGrants = [];
        }
        return token;
      }
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
