"use client";

import { useSession } from "next-auth/react";

// Deve espelhar ROLE_BU_LOCK em middleware.ts — roles BU-scoped recebem
// x-bu-lock no servidor; aqui travamos a UI na mesma BU para manter consistência.
const ROLE_BU_LOCK: Record<string, string> = {
  enrd: "ENRD",
  caza: "CAZA",
  jacqes: "JACQES",
};

/**
 * Returns [lockedBU, sessionLoading].
 * lockedBU is the BU this role is restricted to (e.g. "ENRD"), or null for unrestricted roles.
 * sessionLoading is true while the session is still being fetched — callers should
 * delay data loads until sessionLoading is false to avoid fetching unfiltered data.
 */
export function useLockedBU(): { lockedBU: string | null; sessionLoading: boolean } {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  return {
    lockedBU: ROLE_BU_LOCK[role] ?? null,
    sessionLoading: status === "loading",
  };
}
