"use client";

import { SessionProvider } from "next-auth/react";

export default function AuthProvider({ children }: { children?: React.ReactNode; [extra: string]: unknown }) {
  return <SessionProvider>{children}</SessionProvider>;
}
