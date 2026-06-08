import type { NextApiRequest, NextApiResponse } from "next";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/auth-users";
import { rateLimit } from "@/lib/rate-limit";

// Rate-limit: 5 tentativas / 5 minutos por IP+email. Mitiga credential stuffing
// e brute-force. Resetado por redeploy (aceitável).
const LOGIN_LIMIT       = 5;
const LOGIN_WINDOW_MS   = 5 * 60 * 1000;

function clientIp(req: NextApiRequest): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0]!.trim();
  if (Array.isArray(xff))      return xff[0]?.split(",")[0]?.trim() ?? "unknown";
  const real = req.headers["x-real-ip"];
  if (typeof real === "string") return real.trim();
  return "unknown";
}

const authHandler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Senha",    type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate-limit por IP+email — evita credential stuffing tanto contra
        // um usuário específico quanto distribuído por vários emails do mesmo IP.
        const ip       = clientIp(req as NextApiRequest);
        const emailKey = credentials.email.toLowerCase();
        const ipLimit       = rateLimit(`login:ip:${ip}`,                20, LOGIN_WINDOW_MS);
        const ipEmailLimit  = rateLimit(`login:ip+email:${ip}:${emailKey}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
        if (!ipLimit.allowed || !ipEmailLimit.allowed) {
          // Não vaza se a conta existe — log apenas no servidor.
          console.warn(`[auth] rate-limited login attempt ip=${ip} email=${emailKey}`);
          return null;
        }

        const user = findUserByEmail(credentials.email);
        if (!user) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
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

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return authHandler(req, res);
}
