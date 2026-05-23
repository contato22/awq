"use client";

import { useSession } from "next-auth/react";
import { useCrmBuContext } from "@/lib/crm-bu-context";

const ROLE_BU_LOCK: Record<string, string> = {
  enrd: "ENRD",
  caza: "CAZA",
};

/**
 * Returns { lockedBU, sessionLoading }.
 * Priority: URL-based BU context (/crm/[bu]/ layout) > session role lock > null.
 */
export function useLockedBU(): { lockedBU: string | null; sessionLoading: boolean } {
  const ctxBu = useCrmBuContext();
  const { data: session, status } = useSession();

  if (ctxBu !== null) {
    return { lockedBU: ctxBu, sessionLoading: false };
  }

  const role = (session?.user as { role?: string })?.role ?? "";
  return {
    lockedBU: ROLE_BU_LOCK[role] ?? null,
    sessionLoading: status === "loading",
  };
}
